import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const COMPRAS_TABLE_NAME = "ComprasTabla";
const OFERTAS_TABLE_NAME = "OfertasTabla";

export const handler = async (event) => {
    try {
        const requestBody = JSON.parse(event.body); // Datos actualizados 

        // Obtener el id_compra del cuerpo de la solicitud
        const { id_compra, cantidadComprada, estadoCompra, precioTotal } = requestBody;

        if (!id_compra) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "Se requiere el id_compra para actualizar" }),
            };
        }

        // Validar que la compra exista en la tabla
        const getCompraParams = {
            TableName: COMPRAS_TABLE_NAME,
            Key: { id_compra: id_compra },
        };

        const compraResult = await ddbDocClient.send(new GetCommand(getCompraParams));

        if (!compraResult.Item) {
            // Si no se encuentra la compra, devolver error
            return {
                statusCode: 404,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: `No se encontró la compra con id_compra: ${id_compra}` }),
            };
        }

        // Guardar la cantidad comprada anterior para la lógica de actualización
        const cantidadCompradaAnterior = compraResult.Item.cantidadComprada;

        // Crear la expresión de actualización y valores
        const updateExpressions = [];
        const expressionAttributeValues = {};

        if (cantidadComprada !== undefined) {
            updateExpressions.push('cantidadComprada = :cantidadComprada');
            expressionAttributeValues[':cantidadComprada'] = cantidadComprada;
        }

        if (estadoCompra !== undefined) {
            updateExpressions.push('estadoCompra = :estadoCompra');
            expressionAttributeValues[':estadoCompra'] = estadoCompra;
        }

        if (precioTotal !== undefined) {
            updateExpressions.push('precioTotal = :precioTotal');
            expressionAttributeValues[':precioTotal'] = precioTotal;
        }

        // Si no se proporcionó ningún campo para actualizar, devolver error
        if (updateExpressions.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "No se proporcionaron datos para actualizar" }),
            };
        }

        // Parámetros para actualizar la compra
        const paramsCompra = {
            TableName: COMPRAS_TABLE_NAME,
            Key: { id_compra: id_compra },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'UPDATED_NEW',
        };

        // Actualizar la compra en DynamoDB
        const result = await ddbDocClient.send(new UpdateCommand(paramsCompra));

        // Lógica para actualizar la cantidad en la tabla OfertasTabla
        const id_oferta = compraResult.Item.id_oferta; // Obtener id_oferta de la compra anterior
        const diferenciaCantidad = cantidadComprada !== undefined ? cantidadComprada - cantidadCompradaAnterior : 0;

        if (diferenciaCantidad !== 0) {
            const paramsOferta = {
                TableName: OFERTAS_TABLE_NAME,
                Key: { id_oferta: id_oferta },
                UpdateExpression: 'SET cantidad = cantidad - :diferenciaCantidad',
                ExpressionAttributeValues: {
                    ':diferenciaCantidad': diferenciaCantidad,
                },
                ReturnValues: 'UPDATED_NEW',
            };

            // Actualizar la cantidad en la oferta
            await ddbDocClient.send(new UpdateCommand(paramsOferta));
        }

        return {
            statusCode: 200,
            headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
            body: JSON.stringify({
                message: "Compra actualizada exitosamente",
                compra: result.Attributes,
            }),
        };
    } catch (err) {
        console.error("Error:", err);
        return {
            statusCode: 500,
            headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
            body: JSON.stringify({
                error: "Error al actualizar la compra",
                details: err.message,
            }),
        };
    }
};
