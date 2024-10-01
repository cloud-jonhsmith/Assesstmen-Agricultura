import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event, context) => {
    try {
        // Parsear el cuerpo de la solicitud
        const requestBody = JSON.parse(event.body);

        // Crear los parámetros para DynamoDB
        const params = {
            TableName: "GestionCultivosTabla",
            Item: {
                id: generateId(requestBody.tipo,requestBody.variedad), // Genera un ID único para el producto
                tipo: requestBody.tipo,
                variedad: requestBody.variedad,
                ubicacion: requestBody.ubicacion,
                tamano: requestBody.tamano,
                fechaCultivo: requestBody.fechaCultivo,
            },
        };

        // Insertar el producto en DynamoDB
        const result = await ddbDocClient.send(new PutCommand(params));

        // Retornar la respuesta exitosa
        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({
                message: "Producto registrado exitosamente.",
                producto: params.Item,
            }),
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
                error: "Error al registrar el producto.",
                details: err.message,
            }),
        };
    }
};

// Función auxiliar para generar un ID único (puedes cambiarla según tus necesidades)
function generateId(tipo,variedad) {
    return tipo.toLowerCase() + `_` + variedad.toLowerCase() + `_` + `${Date.now()}`;
}