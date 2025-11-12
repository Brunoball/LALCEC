<?php
// Permitir solicitudes desde cualquier origen
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");

// Si la solicitud es de tipo OPTIONS (preflight), simplemente devuelve una respuesta vacía
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once(__DIR__ . '/../../config/db.php');

// Recibir datos del frontend
$data = json_decode(file_get_contents("php://input"), true);

// Verificar que los datos hayan sido recibidos correctamente
if (!isset($data['nombre']) || !isset($data['apellido']) || !isset($data['meses'])) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

$nombre = trim($data['nombre']);
$apellido = trim($data['apellido']);
$mesesSeleccionados = $data['meses']; // Array de IDs de meses a registrar (1..12)
$anioSeleccionado = isset($data['anio']) ? intval($data['anio']) : intval(date('Y'));

if (!is_array($mesesSeleccionados) || empty($mesesSeleccionados)) {
    echo json_encode(["success" => false, "message" => "No se recibieron meses a registrar."]);
    exit;
}

// Buscar socio (ajusta a tu esquema si es necesario)
$stmt = $conn->prepare("SELECT idSocios FROM socios WHERE nombre = ? AND apellido = ?");
$stmt->bind_param("ss", $nombre, $apellido);
$stmt->execute();
$stmt->bind_result($idSocio);
$stmt->fetch();
$stmt->close();

if (!$idSocio) {
    echo json_encode(["success" => false, "message" => "Socio no encontrado"]);
    exit;
}

// --- Construcción de fechaPago ---
// Requisito: fechaPago = (año = seleccionado) + (mes = actual) + (día = actual, ajustado)
// - idMes: se guarda el mes presionado (periodo pagado)
// - mes_contable: seguimos guardando el mismo idMes
$mesActual = intval(date('n'));  // 1..12 del sistema (mes actual)
$diaHoy   = intval(date('j'));   // 1..31 del sistema (día actual)

// Ajustar el día si no existe en el mes actual del año seleccionado (Feb 29, etc.)
$ultimoDiaMesActualEnAnioSel = (int)date('t', strtotime(sprintf('%04d-%02d-01', $anioSeleccionado, $mesActual)));
$diaAjustado = min($diaHoy, $ultimoDiaMesActualEnAnioSel);

// La misma fechaPago se aplicará a todos los meses seleccionados
$fechaPago = sprintf('%04d-%02d-%02d', $anioSeleccionado, $mesActual, $diaAjustado);

$conn->begin_transaction();

try {
    // Insert preparado
    $stmt = $conn->prepare("
        INSERT INTO pagos (idSocios, idMes, fechaPago, mes_contable)
        VALUES (?, ?, ?, ?)
    ");

    foreach ($mesesSeleccionados as $idMes) {
        $idMes = intval($idMes);
        if ($idMes < 1 || $idMes > 12) {
            throw new Exception("Mes inválido: " . $idMes);
        }

        $mesContable = $idMes; // Guardamos el período pagado

        // idMes = mes del período
        // fechaPago = año seleccionado + mes actual + día actual (ajustado si corresponde)
        $stmt->bind_param("iisi", $idSocio, $idMes, $fechaPago, $mesContable);
        $stmt->execute();
    }

    $stmt->close();
    $conn->commit();

    echo json_encode(["success" => true, "message" => "Pagos registrados con éxito."]);
} catch (Exception $e) {
    $conn->rollback();
    if (isset($stmt) && $stmt) { $stmt->close(); }
    echo json_encode(["success" => false, "message" => "Error al registrar los pagos: " . $e->getMessage()]);
}

$conn->close();
