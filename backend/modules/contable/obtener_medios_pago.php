<?php
// Mostrar errores para depuración
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Habilitar CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

// ✅ Incluir conexión MySQLi
require_once(__DIR__ . '/../../config/db.php');

// Verificar que $conn esté definido correctamente
if (!isset($conn) || $conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos'
    ]);
    exit;
}

try {
    $query = "SELECT idMedios_Pago AS id, Medio_Pago AS nombre FROM mediospago ORDER BY Medio_Pago ASC";
    $result = $conn->query($query);

    if (!$result) {
        throw new Exception("Error en la consulta: " . $conn->error);
    }

    $medios = [];
    while ($row = $result->fetch_assoc()) {
        $medios[] = $row;
    }

    echo json_encode([
        'success' => true,
        'data' => $medios
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener medios de pago: ' . $e->getMessage()
    ]);
}
