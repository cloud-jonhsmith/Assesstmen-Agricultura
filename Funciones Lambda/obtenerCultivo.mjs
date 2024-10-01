import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
    try {
        // Obtener id_producto desde los query parameters 
        const id_producto = event.queryStringParameters?.id_producto;

        if (id_producto) {
            // Si id_producto está presente, obtener el cultivo específico
            const params = {
                TableName: "GestionCultivosTabla",
                Key: {
                    id: id_producto, // Ajustar la clave primaria a "id"
                },
            };

            const data = await ddbDocClient.send(new GetCommand(params));

            if (!data.Item) {
                return {
                    statusCode: 404,
                    headers: {
                        "Content-Type": "application/json",
                        "accept": "application/json",
                    },
                    body: JSON.stringify({ message: "Cultivo no encontrado." }),
                };
            }

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify(data.Item), // Devuelve el objeto completo del cultivo
            };
        } else {
            // Si no hay query param, devolver todos los cultivos
            const params = {
                TableName: "GestionCultivosTabla",
            };

            const data = await ddbDocClient.send(new ScanCommand(params));

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify(data.Items), // Devuelve una lista de todos los cultivos
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
            body: JSON.stringify({ error: "Error al obtener los cultivos." }),
        };
    }
};
