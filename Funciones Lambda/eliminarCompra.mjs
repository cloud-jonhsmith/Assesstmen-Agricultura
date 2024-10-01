import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const COMPRAS_TABLE_NAME = "ComprasTabla";
const OFERTAS_TABLE_NAME = "OfertasTabla";

export const handler = async (event) => {
    try {
        // Obtener el id_compra de los parámetros de consulta
        const { id_compra } = event.queryStringParameters || {};

        if (!id_compra) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "Se requiere el id_compra para eliminar" }),
            };
        }

        // Validar que la compra exista en la tabla
        const getCompraParams = {
            TableName: COMPRAS_TABLE_NAME,
            Key: { id_compra: id_compra }
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

        // Obtener la cantidad comprada de la compra que se va a eliminar
        const cantidadComprada = compraResult.Item.cantidadComprada;
        const id_oferta = compraResult.Item.id_oferta;  // Necesitamos este ID para actualizar la oferta

        // Parámetros para eliminar la compra en DynamoDB
        const params = {
            TableName: COMPRAS_TABLE_NAME,
            Key: { id_compra: id_compra },
        };

        // Eliminar la compra de DynamoDB
        await ddbDocClient.send(new DeleteCommand(params));

        // Actualizar la cantidad en OfertasTabla
        const updateOfertaParams = {
            TableName: OFERTAS_TABLE_NAME,
            Key: { id_oferta: id_oferta },
            UpdateExpression: 'SET cantidad = cantidad + :cantidadComprada',
            ExpressionAttributeValues: {
                ':cantidadComprada': cantidadComprada,
            },
            ReturnValues: 'UPDATED_NEW'
        };

        // Actualizar la oferta con la cantidad aumentada
        await ddbDocClient.send(new UpdateCommand(updateOfertaParams));

        return {
            statusCode: 200,
            headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
            },
            body: JSON.stringify({ message: "Compra eliminada exitosamente" }),
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
                error: "Error al eliminar la compra",
                details: err.message,
            }),
        };
    }
};
