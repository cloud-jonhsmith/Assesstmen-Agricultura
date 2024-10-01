import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Nombre de las tablas DynamoDB
const OFERTAS_TABLE_NAME = "OfertasTabla";
const CULTIVOS_TABLE_NAME = "GestionCultivosTabla";

export const handler = async (event, context) => {
    try {
        // Parsear el cuerpo de la solicitud HTTP
        const requestBody = JSON.parse(event.body);

        // Validar entrada
        const { id_cultivo, precio, cantidad, id_vendedor } = requestBody;
        if (!id_cultivo || !precio || !cantidad || !id_vendedor) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "Faltan parámetros necesarios" }),
            };
        }

        // Verificar si el id_cultivo existe en la tabla GestionCultivosTabla
        const cultivoParams = {
            TableName: CULTIVOS_TABLE_NAME,
            Key: { id: id_cultivo }, // Ajustar la clave primaria a "id"
        };

        const cultivoResult = await ddbDocClient.send(new GetCommand(cultivoParams));

        if (!cultivoResult.Item) {
            return {
                statusCode: 404,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: `No se encontró el cultivo con id_cultivo: ${id_cultivo}` }),
            };
        }

        // Crear una nueva oferta con un ID único y los campos solicitados
        const nuevaOferta = {
            id_oferta: randomUUID(),  // Genera un UUID para la oferta
            id_cultivo: id_cultivo,
            precio: precio,
            cantidad: cantidad,
            fechaPublicacion: new Date().toISOString(),  // Fecha actual en formato ISO
            estado: "disponible",  // El estado inicial de la oferta es "disponible"
            id_vendedor: id_vendedor
        };

        // Parámetros para guardar la oferta en DynamoDB
        const ofertaParams = {
            TableName: OFERTAS_TABLE_NAME,
            Item: nuevaOferta,
        };

        // Insertar la oferta en DynamoDB
        await ddbDocClient.send(new PutCommand(ofertaParams));

        // Respuesta exitosa
        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({ 
                message: "Oferta creada exitosamente", 
                oferta: nuevaOferta 
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
                error: "Error al crear la oferta.",
                details: err.message,
            }),
        };
    }
};
