const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const uuid = require("uuid");

exports.nuevaFase = async (event) => {
    const fasesTable = "nombre_tabla_fases";
    const tareasTable = "nombre_tabla_tareas";
    const nombreFase = event.nombreFase;
    const descripcionFase = event.descripcionFase;
    const tareas = event.tareas;
    const idFase = uuid.v4();
    
    // Agregar fase a la tabla de fases
    await dynamodb.put({ 
        TableName: fasesTable, 
        Item: {
            id: idFase,
            nombre: nombreFase,
            descripcion: descripcionFase
        } 
    }).promise();
    
    // Agregar tareas a la tabla de tareas
    for (let tarea of tareas) {
        const idTarea = uuid.v4();
        const nombreTarea = tarea.nombreTarea;
        const estadoTarea = tarea.estadoTarea;
        
        await dynamodb.put({
            TableName: tareasTable,
            Item: {
                id: idTarea,
                idFase: idFase,
                nombre: nombreTarea,
                estado: estadoTarea
            }
        }).promise();
    }
    
    return { message: "Fase y tareas registradas exitosamente" };
};


exports.nuevaTarea = async (event) => {
    const tareasTable = "nombre_tabla_tareas";
    const idFase = event.idFase;
    const idTarea = event.idTarea || uuid.v4();
    const nombreTarea = event.nombreTarea;
    const estadoTarea = event.estadoTarea || "Pendiente";
    
    // Agregar tarea a la tabla de tareas
    await dynamodb.put({
        TableName: tareasTable,
        Item: {
            id: idTarea,
            idFase: idFase,
            nombre: nombreTarea,
            estado: estadoTarea
        }
    }).promise();
    
    return { message: "Tarea registrada exitosamente" };
};


exports.actualizaTarea = async (event) => {
    const tareasTable = "nombre_tabla_tareas";
    const fasesTable = "nombre_tabla_fases";
    const idTarea = event.idTarea;
    const estadoTarea = event.estadoTarea;
    
    // Obtener información de la tarea
    const tarea = await dynamodb.get({
        TableName: tareasTable,
        Key: {
            id: idTarea
        }
    }).promise();
    
    // Actualizar estado de la tarea
    await dynamodb.update({
        TableName: tareasTable,
        Key: {
            id: idTarea
        },
        UpdateExpression: "set estado = :estado",
        ExpressionAttributeValues: {
            ":estado": estadoTarea
        }
    }).promise();
    
    // Verificar si todas las tareas de la fase están completas
    const idFase = tarea.Item.idFase;
    const tareas = await dynamodb.query({
        TableName: tareasTable,
        KeyConditionExpression: "idFase = :idFase",
        ExpressionAttributeValues: {
            ":idFase": idFase
        }
    }).promise();
    
    let todasTareasCompletas = true;
    for (const tarea of tareas.Items) {
        if (tarea.estado !== "Completada") {
            todasTareasCompletas = false;
            break;
        }
    }
    
    // Si todas las tareas de la fase están completas, actualizar estado de la fase
    if (todasTareasCompletas) {
        await dynamodb.update({
            TableName: fasesTable,
            Key: {
                id: idFase
            },
            UpdateExpression: "set estado = :estado",
            ExpressionAttributeValues: {
                ":estado": "Completada"
            }
        }).promise();
    }
    
    return { message: "Estado de la tarea actualizado exitosamente" };
};
