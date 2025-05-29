<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include(__DIR__ . '/db.php');

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

// Obtener datos del socio
$stmt = $conn->prepare("
    SELECT 
        idSocios,
        idCategoria, 
        Fechaunion, 
        Domicilio_2
    FROM socios 
    WHERE Nombre = ? AND Apellido = ?
");
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
$idSocios = $fila["idSocios"];
$idCategoria = $fila["idCategoria"];
$fechaUnion = $fila["Fechaunion"];
$domicilio = $fila["Domicilio_2"];
$stmt->close();



// Obtener el precio de la categoría
$stmtCategoria = $conn->prepare("
    SELECT Precio_Categoria 
    FROM categorias 
    WHERE idCategorias = ?
");
$stmtCategoria->bind_param("i", $idCategoria);
$stmtCategoria->execute();
$resultadoCategoria = $stmtCategoria->get_result();

if ($resultadoCategoria->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "Categoría no encontrada"]);
    $stmtCategoria->close();
    $conn->close();
    exit();
}

$filaCategoria = $resultadoCategoria->fetch_assoc();
$precioMes = $filaCategoria["Precio_Categoria"];
$stmtCategoria->close();

// Obtener los meses ya pagados por este socio en el año actual
$anioActual = date('Y');
$stmtPagos = $conn->prepare("
    SELECT DISTINCT idMes 
    FROM pagos 
    WHERE idSocios = ? AND YEAR(fechaPago) = ?
");
$stmtPagos->bind_param("ii", $idSocios, $anioActual);
$stmtPagos->execute();
$resultadoPagos = $stmtPagos->get_result();

$mesesPagados = [];
while ($filaPago = $resultadoPagos->fetch_assoc()) {
    $mesesPagados[] = (int)$filaPago['idMes'];
}
$stmtPagos->close();

// Preparar la respuesta
$response = [
    "success" => true,
    "precioMes" => $precioMes,
    "fechaUnion" => $fechaUnion,
    "mesesPagados" => $mesesPagados,
    "domicilio_2" => $domicilio
];

echo json_encode($response);

// Cerrar la conexión
$conn->close();
?>
