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
if (!isset($datos["nombre"]) || !isset($datos["apellido"])) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit();
}

$nombre = trim($datos["nombre"]);
$apellido = trim($datos["apellido"]);

// Buscar el idCategoria del socio
$stmt = $conn->prepare("SELECT idCategoria FROM socios WHERE nombre = ? AND apellido = ?");
$stmt->bind_param("ss", $nombre, $apellido);
$stmt->execute();
$resultado = $stmt->get_result();

if ($resultado->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "Socio no encontrado"]);
    $stmt->close();
    $conn->close();
    exit();
}

$fila = $resultado->fetch_assoc();
$idCategoria = $fila["idCategoria"];
$stmt->close();

// Buscar el precio de la categoría
$stmt = $conn->prepare("SELECT Precio_Categoria FROM categorias WHERE idCategorias = ?");
$stmt->bind_param("i", $idCategoria);
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
