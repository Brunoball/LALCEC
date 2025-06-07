<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../config/db.php');

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

if (!isset($datos["razonSocial"]) || empty(trim($datos["razonSocial"]))) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit();
}

$razonSocial = trim($datos["razonSocial"]);

// Buscar datos de la empresa con JOIN a mediospago
$stmt = $conn->prepare("
    SELECT 
        e.idEmp,
        e.idCategorias,
        e.fechaunion,
        e.domicilio_2,
        COALESCE(mp.Medio_Pago, 'No registrado') AS cobrador
    FROM empresas e
    LEFT JOIN mediospago mp ON e.idMedios_Pago = mp.IdMedios_pago
    WHERE e.razon_social = ?
    LIMIT 1
");
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
$idEmp = $fila["idEmp"];
$idCategorias = $fila["idCategorias"];
$fechaUnion = $fila["fechaunion"];
$domicilio = $fila["domicilio_2"];
$cobrador = $fila["cobrador"];
$stmt->close();

// Obtener el precio de la categoría
$stmtCat = $conn->prepare("SELECT Nombre_Categoria, Precio_Categoria FROM categorias WHERE idCategorias = ?");
$stmtCat->bind_param("i", $idCategorias);
$stmtCat->execute();
$resultadoCat = $stmtCat->get_result();

if ($resultadoCat->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "Categoría no encontrada"]);
    $stmtCat->close();
    $conn->close();
    exit();
}

$filaCat = $resultadoCat->fetch_assoc();
$categoriaNombre = $filaCat["Nombre_Categoria"];
$precioMes = $filaCat["Precio_Categoria"];
$stmtCat->close();

// Obtener meses ya pagados por esta empresa en el año actual
$anioActual = date('Y');
$stmtPagos = $conn->prepare("
    SELECT DISTINCT idMes 
    FROM pagos_empresas
    WHERE idEmp = ? AND YEAR(fechaPago) = ?
");
$stmtPagos->bind_param("ii", $idEmp, $anioActual);
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
    "domicilio_2" => $domicilio,
    "categoria" => $categoriaNombre,
    "cobrador" => $cobrador
];

echo json_encode($response);

// Cerrar conexión
$conn->close();
?>
