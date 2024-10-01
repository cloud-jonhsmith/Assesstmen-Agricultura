import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event, context) => {
    try {
        // Parsear el cuerpo de la solicitud
        const requestBody = JSON.parse(event.body);

        // Verificar si 'id_producto' está presente en el cuerpo de la solicitud
        const { id_producto, tipo, variedad, ubicacion, tamaño, fechaCultivo } = requestBody;
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

        // Mapear 'id_producto' a 'id', que es la clave primaria en la tabla GestionCultivosTabla
        const id = id_producto; // Usamos 'id_producto' como 'id' en la tabla

        // Verificar si el producto existe en la base de datos antes de actualizar
        const getParams = {
            TableName: "GestionCultivosTabla",
            Key: { id: id }, // Clave primaria 'id'
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

        // Generar la expresión de actualización para la tabla
        const { updateExpression, expressionAttributeValues, expressionAttributeNames } =
            generateUpdateExpression(requestBody);

        const params = {
            TableName: "GestionCultivosTabla",
            Key: { id: id }, // Aquí se usa 'id' como la clave primaria en la tabla
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "ALL_NEW", // Retorna el nuevo objeto actualizado
        };

        // Ejecutar la actualización
        const result = await ddbDocClient.send(new UpdateCommand(params));

        // Retornar la respuesta exitosa
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({
                message: "Producto actualizado exitosamente.",
                productoActualizado: result.Attributes,
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
                error: "Error al actualizar el producto.",
                details: err.message,
            }),
        };
    }
};

// Función para generar la expresión de actualización dinámica
function generateUpdateExpression(requestBody) {
    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    // Excluir el campo 'id_producto' ya que no se actualiza
    for (const key in requestBody) {
        if (key !== "id_producto" && requestBody[key] !== undefined) {
            const attributeName = `#${key}`;
            updateExpressionParts.push(`${attributeName} = :${key}`);
            expressionAttributeNames[attributeName] = key;
            expressionAttributeValues[`:${key}`] = requestBody[key];
        }
    }

    return {
        updateExpression: `SET ${updateExpressionParts.join(", ")}`,
        expressionAttributeValues: expressionAttributeValues,
        expressionAttributeNames: expressionAttributeNames,
    };
}
