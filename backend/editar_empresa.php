<?php
header("Access-Control-Allow-Origin: http://localhost:3002");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

include(__DIR__ . '/db.php');

// Obtener los datos de la solicitud (JSON)
$data = json_decode(file_get_contents('php://input'), true);

// Capturar los datos enviados desde el cliente
$idEmp = $data['idEmp'] ?? null;
$razon_social = mb_strtoupper($data['razon_social'] ?? '', 'UTF-8');
$domicilio = mb_strtoupper($data['domicilio'] ?? '', 'UTF-8');
$telefono = mb_strtoupper($data['telefono'] ?? '', 'UTF-8');
$email = mb_strtoupper($data['email'] ?? '', 'UTF-8');
$observacion = mb_strtoupper($data['observacion'] ?? '', 'UTF-8');
$idCategoria = !empty($data['idCategoria']) ? $data['idCategoria'] : null;

header('Content-Type: application/json');

// Verificar que el ID de la empresa esté presente
if (!$idEmp) {
    http_response_code(400);
    echo json_encode(["message" => "Falta el ID de la empresa para actualizar"]);
    exit();
}

// Validar que la categoría no esté vacía
if (empty($idCategoria)) {
    echo json_encode(["message" => "La categoría no puede estar vacía"]);
    exit();
}

// Actualizar la empresa en la base de datos
$query = "
    UPDATE empresas 
    SET 
        razon_social = ?, 
        domicilio = ?, 
        telefono = ?, 
        email = ?, 
        observacion = ?,  
        idCategorias = ?  -- Nombre correcto de la columna
    WHERE idEmp = ?
";

$stmt = $conn->prepare($query);
if ($stmt) {
    // Enlazar los parámetros
    $stmt->bind_param(
        'ssssssi', 
        $razon_social, 
        $domicilio, 
        $telefono, 
        $email, 
        $observacion, 
        $idCategoria, 
        $idEmp
    );

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(["message" => "Empresa actualizada correctamente"]);
        } else {
            echo json_encode(["message" => "No se encontraron cambios para actualizar"]);
        }
    } else {
        error_log("Error al ejecutar la consulta: " . $stmt->error);
        http_response_code(500);
        echo json_encode(["message" => "Error al ejecutar la consulta: " . $stmt->error]);
    }

    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error al preparar la consulta"]);
}

$conn->close();
?>