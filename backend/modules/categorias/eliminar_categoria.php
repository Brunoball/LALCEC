<?php
// Mostrar errores para debugging (quitar en producción)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Responder al preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Incluir archivo de conexión a BD
require_once(__DIR__ . '/../../config/db.php');


// Verificar conexión
if (!$conn) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "No se pudo conectar a la base de datos."
    ]);
    exit();
}

// Obtener datos JSON enviados por POST
$data = json_decode(file_get_contents("php://input"), true);
$nombre_categoria = $data['nombre_categoria'] ?? null;

// Validar parámetro
if (!$nombre_categoria) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Falta el parámetro 'nombre_categoria'."
    ]);
    exit();
}

// Buscar ID de la categoría a eliminar
$query = "SELECT idCategorias FROM categorias WHERE Nombre_Categoria = ?";
$stmt = $conn->prepare($query);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al preparar consulta para buscar categoría."
    ]);
    exit();
}

$stmt->bind_param('s', $nombre_categoria);
$stmt->execute();
$result = $stmt->get_result();
$categoria = $result->fetch_assoc();
$stmt->close();

if (!$categoria) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Categoría no encontrada."
    ]);
    exit();
}

$idCategoria = $categoria['idCategorias'];

// 1. Desvincular socios de la categoría
$updateQuery = "UPDATE socios SET idCategoria = NULL WHERE idCategoria = ?";
$updateStmt = $conn->prepare($updateQuery);
if (!$updateStmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al preparar consulta para desvincular socios."
    ]);
    exit();
}
$updateStmt->bind_param('i', $idCategoria);
$updateStmt->execute();
$updateStmt->close();

// 2. Eliminar precios históricos asociados
$deleteHistQuery = "DELETE FROM historico_precios_categorias WHERE idCategoria = ?";
$histStmt = $conn->prepare($deleteHistQuery);
if (!$histStmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al preparar consulta para eliminar precios históricos."
    ]);
    exit();
}
$histStmt->bind_param('i', $idCategoria);
$histStmt->execute();
$histStmt->close();

// 3. Eliminar la categoría
$deleteQuery = "DELETE FROM categorias WHERE idCategorias = ?";
$deleteStmt = $conn->prepare($deleteQuery);
if (!$deleteStmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al preparar consulta para eliminar categoría."
    ]);
    exit();
}
$deleteStmt->bind_param('i', $idCategoria);
$deleteStmt->execute();

if ($deleteStmt->affected_rows > 0) {
    echo json_encode([
        "success" => true,
        "message" => "Categoría y referencias eliminadas correctamente."
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "No se pudo eliminar la categoría."
    ]);
}

$deleteStmt->close();
$conn->close();
?>
