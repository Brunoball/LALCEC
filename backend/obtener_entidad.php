<?php
// Permitir CORS desde cualquier origen (puedes especificar un dominio si lo prefieres)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Incluir la conexión a la base de datos
include(__DIR__ . '/db.php');
header('Content-Type: application/json');

$tipo = isset($_GET['tipo']) ? $_GET['tipo'] : '';

// Determinar el valor de flag según el tipo de entidad solicitado
$flag = ($tipo === 'socios') ? 0 : (($tipo === 'empresa') ? 1 : null);

if ($flag === null) {
    http_response_code(400);
    echo json_encode(["error" => "Tipo de entidad no válido"]);
    exit;
}

$data = obtenerEntidades($flag);
echo json_encode($data);

function obtenerEntidades($flag) {
    global $conn;

    if (!$conn) {
        http_response_code(500);
        echo json_encode(["error" => "No se pudo conectar a la base de datos"]);
        exit;
    }

    // Seleccionar solo las columnas relevantes para empresas
    $stmt = $conn->prepare("SELECT nombre, apellido, idcategoria, idmedios_pago, domicilio, observacion FROM socios WHERE flag = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["error" => "Error en la preparación de la consulta: " . $conn->error]);
        exit;
    }

    $stmt->bind_param("i", $flag);
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
