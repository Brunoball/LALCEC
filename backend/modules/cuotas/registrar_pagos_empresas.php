<?php
// CORS (ajusta el origen a tu dominio real en producción)
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once(__DIR__ . '/../../config/db.php');

// Body
$data = json_decode(file_get_contents("php://input"), true);

// Validación básica
if (!isset($data['razonSocial']) || !isset($data['meses']) || !is_array($data['meses'])) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

$razonSocial       = trim($data['razonSocial']);
$mesesSeleccionados = $data['meses']; // array de 1..12 (períodos a registrar)
$anioSeleccionado   = isset($data['anio']) ? intval($data['anio']) : intval(date('Y'));

if ($razonSocial === '' || empty($mesesSeleccionados)) {
    echo json_encode(["success" => false, "message" => "Faltan datos para procesar los pagos."]);
    exit;
}

// Buscar empresa
$stmt = $conn->prepare("SELECT idEmp FROM empresas WHERE razon_social = ?");
$stmt->bind_param("s", $razonSocial);
$stmt->execute();
$stmt->bind_result($idEmp);
$stmt->fetch();
$stmt->close();

if (!$idEmp) {
    echo json_encode(["success" => false, "message" => "Empresa no encontrada"]);
    exit;
}

/*
 * --- Construcción de fechaPago (idéntico al flujo de socios) ---
 * fechaPago = {anioSeleccionado}-{mesActual}-{diaAjustado}
 *  - anioSeleccionado: el del desplegable
 *  - mesActual: mes del servidor (1..12)
 *  - diaAjustado: día de hoy ajustado al último día del mesActual en anioSeleccionado
 * idMes = mes del período pagado (el seleccionado)
 */
$mesActual = intval(date('n')); // 1..12 (mes actual del servidor)
$diaHoy    = intval(date('j')); // 1..31 (día actual del servidor)

// Último día del mes actual pero en el año seleccionado
$ultimoDiaMesActualEnAnioSel = (int)date('t', strtotime(sprintf('%04d-%02d-01', $anioSeleccionado, $mesActual)));
$diaAjustado = min($diaHoy, $ultimoDiaMesActualEnAnioSel);

// Misma fechaPago para todos los meses seleccionados
$fechaPago = sprintf('%04d-%02d-%02d', $anioSeleccionado, $mesActual, $diaAjustado);

// Transacción
$conn->begin_transaction();

try {
    // Si tu tabla pagos_empresas SOLO tiene (idEmp, idMes, fechaPago), esta preparación es correcta.
    // Si además tenés columna mes_contable y querés replicar el mismo valor que el período pagado,
    // cambiá el INSERT a: INSERT INTO pagos_empresas (idEmp, idMes, fechaPago, mes_contable) VALUES (?, ?, ?, ?)
    // y bind_param("iisi", $idEmp, $idMes, $fechaPago, $mesContable);
    $stmt = $conn->prepare("INSERT INTO pagos_empresas (idEmp, idMes, fechaPago) VALUES (?, ?, ?)");

    foreach ($mesesSeleccionados as $idMes) {
        $idMes = intval($idMes);
        if ($idMes < 1 || $idMes > 12) {
            throw new Exception("Mes inválido: " . $idMes);
        }

        // Período pagado = idMes seleccionado
        // fechaPago = año del desplegable + mes actual + día ajustado
        $stmt->bind_param("iis", $idEmp, $idMes, $fechaPago);
        $ok = $stmt->execute();
        if (!$ok) {
            throw new Exception("Error al insertar pago (mes $idMes).");
        }
    }

    $stmt->close();
    $conn->commit();

    echo json_encode(["success" => true, "message" => "Pagos registrados con éxito."]);
} catch (Exception $e) {
    $conn->rollback();
    if (isset($stmt) && $stmt) { $stmt->close(); }
    echo json_encode([
        "success" => false,
        "message" => "Error al registrar los pagos: " . $e->getMessage()
    ]);
}

$conn->close();
