import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = "ComprasTabla";

export const handler = async (event) => {
    try {
        const { id_compra } = event.pathParameters || {}; // Obtener el id_compra de los parámetros de la ruta

        if (id_compra) {
            // Obtener una compra específica 
            const params = {
                TableName: TABLE_NAME,
                Key: { id_compra: id_compra },
            };

            const result = await ddbDocClient.send(new GetCommand(params));

            if (!result.Item) {
                return {
                    statusCode: 404,
                    headers: {
                        "Content-Type": "application/json",
                        "accept": "application/json",
                    },
                    body: JSON.stringify({ message: "Compra no encontrada" }),
                };
            }

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify(result.Item),
            };
        } else {
            // Obtener todas las compras 
            const params = {
                TableName: TABLE_NAME,
            };

            const result = await ddbDocClient.send(new ScanCommand(params));

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify(result.Items),
            };
        }
    } catch (err) {
        console.error("Error:", err);
        return {
            statusCode: 500,
            headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
            },
            body: JSON.stringify({ error: "Error al obtener las compras", details: err.message }),
        };
    }
};
