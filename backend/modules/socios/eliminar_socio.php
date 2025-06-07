<?php
header("Access-Control-Allow-Origin: http://localhost:3000"); // Permitir solicitudes desde localhost:3000
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Headers permitidos

// Incluir la conexión a la base de datos
include_once(__DIR__ . '/../../config/db.php');

// Obtener los parámetros GET (nombre y apellido)
$nombre = $_GET['nombre'] ?? null;
$apellido = $_GET['apellido'] ?? null;

header('Content-Type: application/json'); // Asegurar respuesta en formato JSON

if ($nombre && $apellido) {
    // Preparar la consulta para eliminar el socio por nombre y apellido
    $query = "
        DELETE FROM socios 
        WHERE nombre = ? AND apellido = ?
    ";

    // Preparar la consulta
    $stmt = $conn->prepare($query);

    if ($stmt) {
        // Vincular los parámetros y ejecutar la consulta
        $stmt->bind_param('ss', $nombre, $apellido);
        $stmt->execute();

        // Verificar si se eliminó un registro
        if ($stmt->affected_rows > 0) {
            echo json_encode(["message" => "Socio eliminado correctamente"]);
        } else {
            http_response_code(404); // No encontrado
            echo json_encode(["message" => "Socio no encontrado para eliminar"]);
        }

        // Liberar el statement
        $stmt->close();
    } else {
        // Manejo de error en la preparación de la consulta
        error_log("Error al preparar la consulta: " . $conn->error); // Log detallado
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta"]);
    }
} else {
    // Manejo de caso: faltan los parámetros nombre o apellido
    http_response_code(400); // Solicitud incorrecta
    echo json_encode(["message" => "Faltan los parámetros nombre o apellido"]);
}

// Cerrar la conexión a la base de datos
$conn->close();
?>
