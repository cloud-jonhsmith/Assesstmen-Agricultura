import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Nombres de las tablas DynamoDB
const GESTION_CULTIVOS_TABLE = "GestionCultivosTabla";
const OFERTAS_TABLE = "OfertasTabla";

export const handler = async (event) => {
    try {
        // Obtener el parámetro de consulta 'tipo' si está presente
        const tipo = event.queryStringParameters ? event.queryStringParameters.tipo : null;

        let allOfertas = [];

        if (tipo) {
            // Consultar la tabla GestionCultivosTabla para obtener los IDs correspondientes al tipo
            let gestionCultivosParams = {
                TableName: GESTION_CULTIVOS_TABLE,
                FilterExpression: "tipo = :tipo",
                ExpressionAttributeValues: {
                    ":tipo": tipo,
                },
            };

            let gestionCultivosData = [];
            let lastEvaluatedKey = null;

            // Manejo de paginación para obtener todos los cultivos
            do {
                console.log("Escaneando GestionCultivosTabla con tipo:", tipo);
                const result = await ddbDocClient.send(new ScanCommand(gestionCultivosParams));
                console.log("Resultados obtenidos:", result.Items);
                
                gestionCultivosData.push(...result.Items);  // Agregar resultados a la lista
                lastEvaluatedKey = result.LastEvaluatedKey;  // Identificar si hay más páginas
                gestionCultivosParams.ExclusiveStartKey = lastEvaluatedKey;
            } while (lastEvaluatedKey);

            console.log("Total de registros en GestionCultivosTabla con tipo:", tipo, gestionCultivosData);

            const idsCultivos = gestionCultivosData.map(item => item.id);

            // Si no se encontraron cultivos con el tipo especificado, retornar un mensaje
            if (idsCultivos.length === 0) {
                return {
                    statusCode: 404,
                    headers: {
                        "Content-Type": "application/json",
                        "accept": "application/json",
                    },
                    body: JSON.stringify({ message: "No se encontraron cultivos con el tipo especificado." }),
                };
            }

            // Consultar la tabla OfertasTabla para obtener las ofertas que coincidan con los ids de cultivos
            for (let id of idsCultivos) {
                const ofertasParams = {
                    TableName: OFERTAS_TABLE,
                    FilterExpression: "id_cultivo = :id_cultivo AND estado = :estado",
                    ExpressionAttributeValues: {
                        ":id_cultivo": id,
                        ":estado": "disponible",
                    },
                };

                // Manejo de paginación en OfertasTabla
                let lastEvaluatedKeyOfertas = null;
                do {
                    const ofertasResult = await ddbDocClient.send(new ScanCommand(ofertasParams));
                    console.log(`Ofertas obtenidas para id_cultivo ${id}:`, ofertasResult.Items);
                    allOfertas.push(...ofertasResult.Items);  // Agregar resultados a la lista
                    lastEvaluatedKeyOfertas = ofertasResult.LastEvaluatedKey;
                    ofertasParams.ExclusiveStartKey = lastEvaluatedKeyOfertas;
                } while (lastEvaluatedKeyOfertas);
            }

        } else {
            // Si no hay tipo, obtener todas las ofertas disponibles sin filtrar por tipo
            const ofertasParams = {
                TableName: OFERTAS_TABLE,
                FilterExpression: "estado = :estado",
                ExpressionAttributeValues: {
                    ":estado": "disponible",
                },
            };

            // Manejo de paginación para obtener todas las ofertas
            let lastEvaluatedKeyOfertas = null;
            do {
                const ofertasResult = await ddbDocClient.send(new ScanCommand(ofertasParams));
                console.log("Ofertas obtenidas:", ofertasResult.Items);
                allOfertas.push(...ofertasResult.Items);  // Agregar resultados a la lista
                lastEvaluatedKeyOfertas = ofertasResult.LastEvaluatedKey;
                ofertasParams.ExclusiveStartKey = lastEvaluatedKeyOfertas;
            } while (lastEvaluatedKeyOfertas);
        }

        // Verificar si se encontraron ofertas
        if (allOfertas.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                body: JSON.stringify({ message: "No se encontraron ofertas disponibles." }),
            };
        }

        // Retornar la respuesta exitosa con las ofertas
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({ ofertas: allOfertas }),
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
                error: "Error al obtener las ofertas.",
                details: err.message,
            }),
        };
    }
};
