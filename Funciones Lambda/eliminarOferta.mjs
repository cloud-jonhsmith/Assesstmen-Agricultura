import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
    try {
        // Obtener el id_oferta de los parámetros de consulta
        const { id_oferta } = event.queryStringParameters || {}; // Maneja el caso donde no hay parámetros

        // Verificar si 'id_oferta' está presente
        if (!id_oferta) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "El campo 'id_oferta' es obligatorio." }),
            };
        }

        // Verificar si la oferta existe
        const getParams = {
            TableName: "OfertasTabla",
            Key: {
                id_oferta: id_oferta,  // Usamos 'id_oferta' como clave primaria
            },
        };

        const data = await ddbDocClient.send(new GetCommand(getParams));

        // Si la oferta no existe, devolver un error 400
        if (!data.Item) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "La oferta no existe en la tabla." }),
            };
        }

        // Configurar los parámetros de eliminación
        const params = {
            TableName: "OfertasTabla", // Nombre de la tabla en DynamoDB
            Key: { id_oferta: id_oferta }, // Usar 'id_oferta' como clave primaria
        };

        // Ejecutar el comando de eliminación
        await ddbDocClient.send(new DeleteCommand(params));

        // Retornar la respuesta exitosa
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({ message: "Oferta eliminada exitosamente." }),
        };
    } catch (err) {
        console.error("Error:", err);

        // Retornar la respuesta de error
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({
                error: "Error al eliminar la oferta.",
                details: err.message,
            }),
        };
    }
};
