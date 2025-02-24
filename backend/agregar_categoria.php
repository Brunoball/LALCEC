<?php

header("Access-Control-Allow-Origin: *"); // Permitir cualquier origen
header("Access-Control-Allow-Methods: POST, GET, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Headers permitidos

// Manejar solicitudes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}


require_once "db.php"; // Importar la conexión a la BD

function agregar_categoria($nombre_categoria, $precio_categoria) {
    global $conn;

    // Preparar la consulta SQL para insertar una nueva categoría
    $sql = "INSERT INTO categorias (Nombre_Categoria, Precio_Categoria) VALUES (?, ?)";

    // Preparar la sentencia
    if ($stmt = $conn->prepare($sql)) {
        // Vincular los parámetros
        $stmt->bind_param("sd", $nombre_categoria, $precio_categoria);

        // Ejecutar la consulta
        if ($stmt->execute()) {
            return ["success" => "Categoría agregada exitosamente."];
        } else {
            return ["error" => "Error al agregar la categoría."];
        }

        // Cerrar la sentencia
        $stmt->close();
    } else {
        return ["error" => "Error en la preparación de la consulta."];
    }
}

// Leer los datos de la solicitud JSON
$data = json_decode(file_get_contents('php://input'), true);

// Verificar si los datos fueron recibidos correctamente
if (isset($data['nombre_categoria']) && isset($data['precio_categoria'])) {
    $nombre_categoria = $data['nombre_categoria'];
    $precio_categoria = $data['precio_categoria'];

    // Llamar a la función para agregar la categoría
    $resultado = agregar_categoria($nombre_categoria, $precio_categoria);
} else {
    $resultado = ["error" => "Faltan datos para agregar la categoría."];
}

// Enviar la respuesta JSON
header('Content-Type: application/json');
echo json_encode($resultado);

// Cerrar la conexión
$conn->close();
?>
