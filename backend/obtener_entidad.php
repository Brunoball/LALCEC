<?php
// Permitir CORS desde cualquier origen (puedes especificar un dominio si lo prefieres)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// El resto de tu código
include(__DIR__ . '/db.php');
header('Content-Type: application/json');

$tipo = isset($_GET['tipo']) ? $_GET['tipo'] : '';

if ($tipo !== 'socios' && $tipo !== 'empresa') {
    http_response_code(400);
    echo json_encode(["error" => "Tipo de entidad no válido"]);
    exit;
}

$data = obtenerEntidades($tipo);
echo json_encode($data);

function obtenerEntidades($tipoEntidad) {
    global $conn;

    if (!$conn) {
        http_response_code(500);
        echo json_encode(["error" => "No se pudo conectar a la base de datos"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT * FROM socios WHERE Tipo_Entidad = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["error" => "Error en la preparación de la consulta: " . $conn->error]);
        exit;
    }

    $stmt->bind_param("s", $tipoEntidad);
    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result) {
        http_response_code(500);
        echo json_encode(["error" => "Error en la ejecución de la consulta: " . $stmt->error]);
        exit;
    }

    $entidades = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    return $entidades; 
}
?>
