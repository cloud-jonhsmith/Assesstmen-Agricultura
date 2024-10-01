import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Nombre de la tabla DynamoDB 
const TABLE_NAME = "OfertasTabla";

export const handler = async (event) => {
    try {
        // Parsear el cuerpo de la solicitud HTTP
        const requestBody = JSON.parse(event.body);

        // Validar entrada
        const { id_oferta, precio, cantidad, estado } = requestBody;
        if (!id_oferta) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "Falta el ID de la oferta" }),
            };
        }
        
        // Verificar si el producto existe en la base de datos antes de actualizar
        const getParams = {
            TableName: TABLE_NAME,
            Key: { id_oferta: id_oferta }, // Clave primaria 'id_oferta'
        };

        const getResult = await ddbDocClient.send(new GetCommand(getParams));

        // Si el producto no existe, devolver un error 400
        if (!getResult.Item) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "El producto no existe en la tabla." }),
            };
        }

        // Crear un objeto de actualización
        const updateExpression = [];
        const expressionAttributeValues = {};

        if (precio !== undefined) {
            updateExpression.push("precio = :precio");
            expressionAttributeValues[":precio"] = precio;
        }
        if (cantidad !== undefined) {
            updateExpression.push("cantidad = :cantidad");
            expressionAttributeValues[":cantidad"] = cantidad;
        }
        if (estado !== undefined) {
            updateExpression.push("estado = :estado");
            expressionAttributeValues[":estado"] = estado;
        }

        if (updateExpression.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "No se proporcionaron valores para actualizar" }),
            };
        }

        // Parámetros para actualizar la oferta en DynamoDB
        const params = {
            TableName: TABLE_NAME,
            Key: {
                id_oferta: id_oferta, // La clave primaria para identificar el item
            },
            UpdateExpression: `SET ${updateExpression.join(", ")}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "UPDATED_NEW", // Devuelve los nuevos valores de los atributos actualizados
        };

        // Ejecutar la actualización en DynamoDB
        const result = await ddbDocClient.send(new UpdateCommand(params));

        // Respuesta exitosa
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({
                message: "Oferta actualizada exitosamente.",
                updatedAttributes: result.Attributes,
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
                error: "Error al actualizar la oferta.",
                details: err.message,
            }),
        };
    }
};
