import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Nombre de las tablas DynamoDB
const COMPRAS_TABLE_NAME = "ComprasTabla";
const OFERTAS_TABLE_NAME = "OfertasTabla";

const formatDate = (date) => {
    // Convertir la fecha a YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mes empieza en 0
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const handler = async (event, context) => {
    try {
        // Parsear el cuerpo de la solicitud HTTP
        const requestBody = JSON.parse(event.body);

        // Validar entrada
        const { id_oferta, cantidadComprada, id_comprador, precioTotal } = requestBody;
        if (!id_oferta || !cantidadComprada || !id_comprador || !precioTotal) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "Faltan parámetros necesarios" }),
            };
        }

        // Validar que el id_oferta exista en OfertasTabla
        const getOfertaParams = {
            TableName: OFERTAS_TABLE_NAME,
            Key: { id_oferta: id_oferta }
        };

        const ofertaResult = await ddbDocClient.send(new GetCommand(getOfertaParams));

        if (!ofertaResult.Item) {
            // Si no se encuentra la oferta, devolver error
            return {
                statusCode: 404,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: `No se encontró la oferta con id_oferta: ${id_oferta}` }),
            };
        }

        // Verificar que la cantidad en la oferta es suficiente para la compra
        if (ofertaResult.Item.cantidad < cantidadComprada) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: `Cantidad solicitada supera la cantidad disponible en la oferta. Disponible: ${ofertaResult.Item.cantidad}` }),
            };
        }

        // Crear una nueva compra con un ID único y los campos solicitados
        const nuevaCompra = {
            id_compra: randomUUID(),  // Genera un UUID para la compra
            id_oferta: id_oferta,
            cantidadComprada: cantidadComprada,
            fechaCompra: formatDate(new Date()),  // Fecha actual en formato YYYY-MM-DD
            estadoCompra: "procesada",  // Estado inicial de la compra
            id_comprador: id_comprador,
            precioTotal: precioTotal
        };

        // Parámetros para guardar la compra en DynamoDB
        const paramsCompra = {
            TableName: COMPRAS_TABLE_NAME,
            Item: nuevaCompra,
        };

        // Insertar la compra en DynamoDB
        await ddbDocClient.send(new PutCommand(paramsCompra));

        // Parámetros para actualizar el inventario en OfertasTabla
        const paramsOferta = {
            TableName: OFERTAS_TABLE_NAME,
            Key: { id_oferta: id_oferta },
            UpdateExpression: 'SET cantidad = cantidad - :cantidadComprada',
            ExpressionAttributeValues: {
                ':cantidadComprada': cantidadComprada
            },
            ReturnValues: 'UPDATED_NEW'
        };

        // Actualizar la oferta con la cantidad reducida
        const ofertaActualizada = await ddbDocClient.send(new UpdateCommand(paramsOferta));

        // Verificar si el inventario llegó a 0 para actualizar el estado de la oferta
        if (ofertaActualizada.Attributes.cantidad <= 0) {
            const paramsCerrarOferta = {
                TableName: OFERTAS_TABLE_NAME,
                Key: { id_oferta: id_oferta },
                UpdateExpression: 'SET estado = :estado',
                ExpressionAttributeValues: { ':estado': 'Finalizada' }
            };
            await ddbDocClient.send(new UpdateCommand(paramsCerrarOferta));
        }

        // Respuesta exitosa
        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({ 
                message: "Compra creada exitosamente", 
                compra: nuevaCompra 
            }),
        };
    } catch (err) {
        console.error("Error:", err);

        // Respuesta de error
        return {
            statusCode: 500,
            headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
            },
            body: JSON.stringify({
                error: "Error al crear la compra.",
                details: err.message,
            }),
        };
    }
};
