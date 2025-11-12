<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../config/db.php');

// --- CORS preflight ---
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

// --- Solo POST ---
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

// --- Leer datos JSON ---
$datos = json_decode(file_get_contents("php://input"), true);
if (!isset($datos["razonSocial"]) || empty(trim($datos["razonSocial"]))) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit();
}

$razonSocial = trim($datos["razonSocial"]);

// ======================================================
// 1️⃣ Buscar empresa y su categoría / medio de pago
// ======================================================
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

if ($resultado->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Empresa no encontrada"]);
    $stmt->close();
    $conn->close();
    exit();
}

$fila = $resultado->fetch_assoc();
$idEmp = (int)$fila["idEmp"];
$idCategorias = (int)$fila["idCategorias"];
$fechaUnion = $fila["fechaunion"];
$domicilio = $fila["domicilio_2"];
$cobrador = $fila["cobrador"];
$stmt->close();

// ======================================================
// 2️⃣ Obtener categoría y precio mensual
// ======================================================
$stmtCat = $conn->prepare("
    SELECT Nombre_Categoria, Precio_Categoria
    FROM categorias
    WHERE idCategorias = ?
");
$stmtCat->bind_param("i", $idCategorias);
$stmtCat->execute();
$resCat = $stmtCat->get_result();

if ($resCat->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Categoría no encontrada"]);
    $stmtCat->close();
    $conn->close();
    exit();
}

$filaCat = $resCat->fetch_assoc();
$categoriaNombre = $filaCat["Nombre_Categoria"];
$precioMes = (float)$filaCat["Precio_Categoria"];
$stmtCat->close();

// ======================================================
// 3️⃣ Obtener pagos agrupados por año
// ======================================================
$stmtPagos = $conn->prepare("
    SELECT YEAR(fechaPago) AS anio, idMes
    FROM pagos_empresas
    WHERE idEmp = ?
    ORDER BY fechaPago ASC
");
$stmtPagos->bind_param("i", $idEmp);
$stmtPagos->execute();
$resPagos = $stmtPagos->get_result();

$pagosPorAnio = [];
while ($filaPago = $resPagos->fetch_assoc()) {
    $anio = (int)$filaPago["anio"];
    $mes = (int)$filaPago["idMes"];
    if (!isset($pagosPorAnio[$anio])) {
        $pagosPorAnio[$anio] = [];
    }
    if (!in_array($mes, $pagosPorAnio[$anio], true)) {
        $pagosPorAnio[$anio][] = $mes;
    }
}
$stmtPagos->close();

// ======================================================
// 4️⃣ Preparar respuesta
// ======================================================
$response = [
    "success" => true,
    "precioMes" => $precioMes,
    "fechaUnion" => $fechaUnion,
    "domicilio_2" => $domicilio,
    "categoria" => $categoriaNombre,
    "cobrador" => $cobrador,
    "pagosPorAnio" => $pagosPorAnio
];

// ======================================================
// 5️⃣ Enviar respuesta
// ======================================================
echo json_encode($response, JSON_UNESCAPED_UNICODE);
$conn->close();
