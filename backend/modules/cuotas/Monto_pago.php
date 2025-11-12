<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../config/db.php');

// CORS preflight
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

$payload = json_decode(file_get_contents("php://input"), true);
$nombre   = isset($payload["nombre"])   ? trim($payload["nombre"])   : null;
$apellido = isset($payload["apellido"]) ? trim($payload["apellido"]) : null;

if (!$nombre || !$apellido) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit();
}

/* =========================
   1) Buscar socio + datos
   ========================= */
$stmt = $conn->prepare("
    SELECT 
        s.idSocios,
        s.idCategoria,
        s.Fechaunion,
        s.Domicilio,
        s.Domicilio_2,
        COALESCE(m.Medio_Pago, 'No registrado') AS cobrador
    FROM socios s
    LEFT JOIN mediospago m ON s.idMedios_Pago = m.IdMedios_pago
    WHERE s.Nombre = ? AND s.Apellido = ?
    LIMIT 1
");
$stmt->bind_param("ss", $nombre, $apellido);
$stmt->execute();
$rs = $stmt->get_result();

if ($rs->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Socio no encontrado"]);
    $stmt->close();
    $conn->close();
    exit();
}
$row = $rs->fetch_assoc();
$stmt->close();

$idSocios    = (int)$row["idSocios"];
$idCategoria = (int)$row["idCategoria"];
$fechaUnion  = $row["Fechaunion"];
$domicilio   = $row["Domicilio"];
$domicilio2  = $row["Domicilio_2"];
$cobrador    = $row["cobrador"];

/* =========================
   2) Categoría y precio
   ========================= */
$stmt = $conn->prepare("
    SELECT Nombre_Categoria, Precio_Categoria 
    FROM categorias 
    WHERE idCategorias = ?
    LIMIT 1
");
$stmt->bind_param("i", $idCategoria);
$stmt->execute();
$rs = $stmt->get_result();
if ($rs->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Categoría no encontrada"]);
    $stmt->close();
    $conn->close();
    exit();
}
$cat = $rs->fetch_assoc();
$stmt->close();

$nombreCategoria = $cat["Nombre_Categoria"];
$precioMes       = (float)$cat["Precio_Categoria"];

/* =======================================================
   3) Pagos por AÑO -> { "2025":[1,3,7], "2026":[1,2,3] }
   ======================================================= */
$stmt = $conn->prepare("
    SELECT YEAR(fechaPago) AS anio, idMes
    FROM pagos
    WHERE idSocios = ?
");
$stmt->bind_param("i", $idSocios);
$stmt->execute();
$rs = $stmt->get_result();

$pagosPorAnio = []; // anio => [idMes, ...]
while ($p = $rs->fetch_assoc()) {
    $anio = (int)$p["anio"];
    $mes  = (int)$p["idMes"];
    if (!isset($pagosPorAnio[$anio])) $pagosPorAnio[$anio] = [];
    // evitar duplicados
    if (!in_array($mes, $pagosPorAnio[$anio], true)) {
        $pagosPorAnio[$anio][] = $mes;
    }
}
$stmt->close();

// ordenar meses de cada año por si querés prolijidad
foreach ($pagosPorAnio as $a => $arr) {
    sort($pagosPorAnio[$a], SORT_NUMERIC);
}

/* =========================
   4) Respuesta
   ========================= */
echo json_encode([
    "success"      => true,
    "precioMes"    => $precioMes,
    "fechaUnion"   => $fechaUnion,
    "categoria"    => $nombreCategoria,
    "domicilio"    => $domicilio,
    "domicilio_2"  => $domicilio2,
    "cobrador"     => $cobrador,
    // Nuevo: meses pagados agrupados por año
    "pagosPorAnio" => $pagosPorAnio
], JSON_UNESCAPED_UNICODE);

$conn->close();
