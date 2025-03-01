<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include(__DIR__ . '/db.php'); // Asegúrate de que db.php contiene las credenciales

// Manejo de preflight request (CORS)
if ($_SERVER["REQUEST_METHOD"] == "OPTIONS") {
    http_response_code(200);
    exit();
}

// Solo aceptar solicitudes POST
if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

// Leer datos del JSON recibido
$datos = json_decode(file_get_contents("php://input"), true);
if (!isset($datos["razonSocial"])) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit();
}

$razonSocial = trim($datos["razonSocial"]);

// Buscar el idCategorias de la empresa
$stmt = $conn->prepare("SELECT idCategorias FROM empresas WHERE razon_social = ?");
$stmt->bind_param("s", $razonSocial);
$stmt->execute();
$resultado = $stmt->get_result();

if ($resultado->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "Empresa no encontrada"]);
    $stmt->close();
    $conn->close();
    exit();
}

$fila = $resultado->fetch_assoc();
$idCategorias = $fila["idCategorias"]; // Usamos idCategorias en lugar de idCategoria
$stmt->close();

// Buscar el precio de la categoría
$stmt = $conn->prepare("SELECT Precio_Categoria FROM categorias WHERE idCategorias = ?");
$stmt->bind_param("i", $idCategorias);
$stmt->execute();
$resultado = $stmt->get_result();

if ($resultado->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "No se encontró la categoría"]);
    $stmt->close();
    $conn->close();
    exit();
}

$fila = $resultado->fetch_assoc();
$precioMes = $fila["Precio_Categoria"];

echo json_encode(["success" => true, "precioMes" => $precioMes]);

$stmt->close();
$conn->close();
?>