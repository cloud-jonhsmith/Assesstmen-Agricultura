import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
    try {
        // Obtener los parámetros de la consulta
        const { id_producto } = event.queryStringParameters || {};

        // Verificar si 'id_producto' está presente en los parámetros de consulta
        if (!id_producto) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "El campo 'id_producto' es obligatorio." }),
            };
        }

        // Verificar si el producto existe
        const getParams = {
            TableName: "GestionCultivosTabla",
            Key: {
                id: id_producto,  // Usar 'id_producto' como 'id' en la tabla
            },
        };

        const data = await ddbDocClient.send(new GetCommand(getParams));

        // Si el producto no existe, devolver un error 400
        if (!data.Item) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "El producto no existe en la tabla." }),
            };
        }

        // Configurar los parámetros de eliminación
        const params = {
            TableName: "GestionCultivosTabla", // Nombre de la tabla en DynamoDB
            Key: { id: id_producto }, // Usar 'id_producto' como clave primaria
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
            body: JSON.stringify({ message: "Producto eliminado exitosamente." }),
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
                error: "Error al eliminar el producto.",
                details: err.message,
            }),
        };
    }
};
