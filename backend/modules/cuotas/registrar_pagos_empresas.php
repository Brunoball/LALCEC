<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once(__DIR__ . '/../../config/db.php');

function responder($data, $statusCode = 200)
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function nombreMesES($idMes)
{
    $meses = [
        1  => 'ENERO',
        2  => 'FEBRERO',
        3  => 'MARZO',
        4  => 'ABRIL',
        5  => 'MAYO',
        6  => 'JUNIO',
        7  => 'JULIO',
        8  => 'AGOSTO',
        9  => 'SEPTIEMBRE',
        10 => 'OCTUBRE',
        11 => 'NOVIEMBRE',
        12 => 'DICIEMBRE',
    ];

    return $meses[(int)$idMes] ?? ("MES " . (int)$idMes);
}

function limpiarTextoVisible($texto)
{
    $texto = trim((string)$texto);
    $texto = preg_replace('/\s+/', ' ', $texto);
    return $texto;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    responder([
        "success" => false,
        "message" => "JSON inválido."
    ], 400);
}

$mesesSeleccionados = $data['meses'] ?? [];
$anioSeleccionado   = isset($data['anio']) ? intval($data['anio']) : intval(date('Y'));
$modoMasivo         = !empty($data['modo_masivo']);

if (!is_array($mesesSeleccionados) || empty($mesesSeleccionados)) {
    responder([
        "success" => false,
        "message" => "No se recibieron meses a registrar."
    ], 400);
}

$mesesSeleccionados = array_values(array_unique(array_map('intval', $mesesSeleccionados)));
$mesesSeleccionados = array_values(array_filter($mesesSeleccionados, function ($m) {
    return $m >= 1 && $m <= 12;
}));

if (empty($mesesSeleccionados)) {
    responder([
        "success" => false,
        "message" => "Los meses enviados no son válidos."
    ], 400);
}

$idsEmpresas = [];

// ===== Modo masivo por IDs =====
if (isset($data['ids']) && is_array($data['ids']) && count($data['ids']) > 0) {
    $idsEmpresas = array_values(array_unique(array_map('intval', $data['ids'])));
    $idsEmpresas = array_values(array_filter($idsEmpresas, function ($id) {
        return $id > 0;
    }));
}
// ===== Modo individual por razón social =====
else {
    if (!isset($data['razonSocial'])) {
        responder([
            "success" => false,
            "message" => "Datos incompletos."
        ], 400);
    }

    $razonSocial = trim($data['razonSocial']);

    $stmt = $conn->prepare("SELECT idEmp FROM empresas WHERE razon_social = ? LIMIT 1");
    if (!$stmt) {
        responder([
            "success" => false,
            "message" => "Error preparando consulta de empresa."
        ], 500);
    }

    $stmt->bind_param("s", $razonSocial);
    $stmt->execute();
    $stmt->bind_result($idEmp);
    $stmt->fetch();
    $stmt->close();

    if (!$idEmp) {
        responder([
            "success" => false,
            "message" => "Empresa no encontrada"
        ], 404);
    }

    $idsEmpresas = [intval($idEmp)];
}

if (empty($idsEmpresas)) {
    responder([
        "success" => false,
        "message" => "No hay empresas válidas para registrar."
    ], 400);
}

// Fecha de pago igual que tu lógica actual
$mesActual = intval(date('n'));
$diaHoy = intval(date('j'));
$ultimoDiaMesActualEnAnioSel = (int)date('t', strtotime(sprintf('%04d-%02d-01', $anioSeleccionado, $mesActual)));
$diaAjustado = min($diaHoy, $ultimoDiaMesActualEnAnioSel);
$fechaPago = sprintf('%04d-%02d-%02d', $anioSeleccionado, $mesActual, $diaAjustado);

$resumen = [
    "entidades_recibidas" => count($idsEmpresas),
    "pagos_solicitados"   => count($idsEmpresas) * count($mesesSeleccionados),
    "pagos_insertados"    => 0,
    "pagos_omitidos"      => 0,
    "detalles_omitidos"   => [],
];

$conn->begin_transaction();

try {
    $stmtDatosEmpresa = $conn->prepare("
        SELECT razon_social
        FROM empresas
        WHERE idEmp = ?
        LIMIT 1
    ");

    $stmtExistePago = $conn->prepare("
        SELECT 1
        FROM pagos_empresas
        WHERE idEmp = ? AND idMes = ? AND YEAR(fechaPago) = ?
        LIMIT 1
    ");

    $stmtInsert = $conn->prepare("
        INSERT INTO pagos_empresas (idEmp, idMes, fechaPago)
        VALUES (?, ?, ?)
    ");

    if (!$stmtDatosEmpresa || !$stmtExistePago || !$stmtInsert) {
        throw new Exception("No se pudieron preparar las consultas.");
    }

    foreach ($idsEmpresas as $idEmp) {
        $stmtDatosEmpresa->bind_param("i", $idEmp);
        $stmtDatosEmpresa->execute();
        $stmtDatosEmpresa->store_result();

        if ($stmtDatosEmpresa->num_rows === 0) {
            $resumen["pagos_omitidos"] += count($mesesSeleccionados);

            if (count($resumen["detalles_omitidos"]) < 50) {
                $resumen["detalles_omitidos"][] = "La empresa seleccionada no existe o fue eliminada.";
            }

            $stmtDatosEmpresa->free_result();
            continue;
        }

        $stmtDatosEmpresa->bind_result($razonSocial);
        $stmtDatosEmpresa->fetch();

        $nombreVisible = limpiarTextoVisible($razonSocial);
        if ($nombreVisible === '') {
            $nombreVisible = 'EMPRESA SIN NOMBRE';
        }

        $stmtDatosEmpresa->free_result();

        foreach ($mesesSeleccionados as $idMes) {
            $stmtExistePago->bind_param("iii", $idEmp, $idMes, $anioSeleccionado);
            $stmtExistePago->execute();
            $stmtExistePago->store_result();

            if ($stmtExistePago->num_rows > 0) {
                $resumen["pagos_omitidos"]++;

                if (count($resumen["detalles_omitidos"]) < 50) {
                    $mesTexto = nombreMesES($idMes) . " " . $anioSeleccionado;
                    $resumen["detalles_omitidos"][] = "{$nombreVisible}: {$mesTexto} ya estaba registrado.";
                }

                $stmtExistePago->free_result();
                continue;
            }

            $stmtExistePago->free_result();

            $stmtInsert->bind_param("iis", $idEmp, $idMes, $fechaPago);
            $stmtInsert->execute();

            $resumen["pagos_insertados"]++;
        }
    }

    $stmtDatosEmpresa->close();
    $stmtExistePago->close();
    $stmtInsert->close();

    $conn->commit();

    $mensaje = $resumen["pagos_insertados"] > 0
        ? "Pagos registrados con éxito."
        : "No se registraron pagos nuevos. Es posible que ya estuvieran cargados.";

    responder([
        "success" => true,
        "message" => $mensaje,
        "resumen" => $resumen,
    ]);
} catch (Throwable $e) {
    $conn->rollback();

    if (isset($stmtDatosEmpresa) && $stmtDatosEmpresa) $stmtDatosEmpresa->close();
    if (isset($stmtExistePago) && $stmtExistePago) $stmtExistePago->close();
    if (isset($stmtInsert) && $stmtInsert) $stmtInsert->close();

    responder([
        "success" => false,
        "message" => "Error al registrar los pagos: " . $e->getMessage()
    ], 500);
}

$conn->close();