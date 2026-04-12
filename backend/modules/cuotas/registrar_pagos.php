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

function nombreSocioVisible($apellido, $nombre)
{
    $apellido = limpiarTextoVisible($apellido);
    $nombre   = limpiarTextoVisible($nombre);

    $completo = trim($apellido . ' ' . $nombre);
    return $completo !== '' ? $completo : 'SOCIO SIN NOMBRE';
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

$idsSocios = [];

// ===== Modo masivo por IDs =====
if (isset($data['ids']) && is_array($data['ids']) && count($data['ids']) > 0) {
    $idsSocios = array_values(array_unique(array_map('intval', $data['ids'])));
    $idsSocios = array_values(array_filter($idsSocios, function ($id) {
        return $id > 0;
    }));
}
// ===== Modo individual por nombre/apellido =====
else {
    if (!isset($data['nombre']) || !isset($data['apellido'])) {
        responder([
            "success" => false,
            "message" => "Datos incompletos."
        ], 400);
    }

    $nombre   = trim($data['nombre']);
    $apellido = trim($data['apellido']);

    $stmt = $conn->prepare("SELECT idSocios FROM socios WHERE Nombre = ? AND Apellido = ? LIMIT 1");
    if (!$stmt) {
        responder([
            "success" => false,
            "message" => "Error preparando consulta de socio."
        ], 500);
    }

    $stmt->bind_param("ss", $nombre, $apellido);
    $stmt->execute();
    $stmt->bind_result($idSocio);
    $stmt->fetch();
    $stmt->close();

    if (!$idSocio) {
        responder([
            "success" => false,
            "message" => "Socio no encontrado"
        ], 404);
    }

    $idsSocios = [intval($idSocio)];
}

if (empty($idsSocios)) {
    responder([
        "success" => false,
        "message" => "No hay socios válidos para registrar."
    ], 400);
}

// Fecha de pago igual que tu lógica actual
$mesActual = intval(date('n'));
$diaHoy = intval(date('j'));
$ultimoDiaMesActualEnAnioSel = (int)date('t', strtotime(sprintf('%04d-%02d-01', $anioSeleccionado, $mesActual)));
$diaAjustado = min($diaHoy, $ultimoDiaMesActualEnAnioSel);
$fechaPago = sprintf('%04d-%02d-%02d', $anioSeleccionado, $mesActual, $diaAjustado);

$resumen = [
    "entidades_recibidas" => count($idsSocios),
    "pagos_solicitados"   => count($idsSocios) * count($mesesSeleccionados),
    "pagos_insertados"    => 0,
    "pagos_omitidos"      => 0,
    "detalles_omitidos"   => [],
];

$conn->begin_transaction();

try {
    $stmtDatosSocio = $conn->prepare("
        SELECT Apellido, Nombre
        FROM socios
        WHERE idSocios = ?
        LIMIT 1
    ");

    $stmtExistePago = $conn->prepare("
        SELECT 1
        FROM pagos
        WHERE idSocios = ? AND idMes = ? AND YEAR(fechaPago) = ?
        LIMIT 1
    ");

    $stmtInsert = $conn->prepare("
        INSERT INTO pagos (idSocios, idMes, fechaPago, mes_contable)
        VALUES (?, ?, ?, ?)
    ");

    if (!$stmtDatosSocio || !$stmtExistePago || !$stmtInsert) {
        throw new Exception("No se pudieron preparar las consultas.");
    }

    foreach ($idsSocios as $idSocio) {
        $stmtDatosSocio->bind_param("i", $idSocio);
        $stmtDatosSocio->execute();
        $stmtDatosSocio->store_result();

        if ($stmtDatosSocio->num_rows === 0) {
            $resumen["pagos_omitidos"] += count($mesesSeleccionados);

            if (count($resumen["detalles_omitidos"]) < 50) {
                $resumen["detalles_omitidos"][] = "El socio seleccionado no existe o fue eliminado.";
            }

            $stmtDatosSocio->free_result();
            continue;
        }

        $stmtDatosSocio->bind_result($apellidoSocio, $nombreSocio);
        $stmtDatosSocio->fetch();

        $nombreVisible = nombreSocioVisible($apellidoSocio, $nombreSocio);

        $stmtDatosSocio->free_result();

        foreach ($mesesSeleccionados as $idMes) {
            $stmtExistePago->bind_param("iii", $idSocio, $idMes, $anioSeleccionado);
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

            $mesContable = $idMes;
            $stmtInsert->bind_param("iisi", $idSocio, $idMes, $fechaPago, $mesContable);
            $stmtInsert->execute();

            $resumen["pagos_insertados"]++;
        }
    }

    $stmtDatosSocio->close();
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

    if (isset($stmtDatosSocio) && $stmtDatosSocio) $stmtDatosSocio->close();
    if (isset($stmtExistePago) && $stmtExistePago) $stmtExistePago->close();
    if (isset($stmtInsert) && $stmtInsert) $stmtInsert->close();

    responder([
        "success" => false,
        "message" => "Error al registrar los pagos: " . $e->getMessage()
    ], 500);
}

$conn->close();