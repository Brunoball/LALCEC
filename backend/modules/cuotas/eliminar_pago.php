<?php
header('Content-Type: application/json');

// (Opcional) Para que MySQLi lance excepciones y veas errores reales
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once(__DIR__ . '/../../config/db.php'); 
if (!isset($conn) || !($conn instanceof mysqli)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Conexión a BD no disponible']);
    exit;
}

try { $conn->set_charset("utf8mb4"); } catch (Throwable $e) {}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'mensaje' => 'Método no permitido']);
    exit;
}

// Lee JSON o form-data
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data) || empty($data)) {
    $data = $_POST;
}

// Inputs
$tipo    = isset($data['tipo']) ? trim((string)$data['tipo']) : '';
$mes     = isset($data['mes']) ? trim((string)$data['mes']) : ''; // informativo si ya viene idMes
$idPago  = isset($data['id_pago']) && $data['id_pago'] !== '' ? (int)$data['id_pago'] : null;
$idPago  = isset($data['idPago'])  && $data['idPago']  !== '' ? (int)$data['idPago']  : $idPago;
$id      = isset($data['id'])      && $data['id']      !== '' ? (int)$data['id']      : null;
$idMes   = isset($data['idMes'])   && $data['idMes']   !== '' ? (int)$data['idMes']   : null;
$idMes   = isset($data['id_mes'])  && $data['id_mes']  !== '' ? (int)$data['id_mes']  : $idMes;

if ($tipo === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'mensaje' => 'Falta "tipo" (socio|empresa)']);
    exit;
}
if (!in_array($tipo, ['socio','empresa'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'mensaje' => 'Tipo inválido (use "socio" o "empresa")']);
    exit;
}

// Mapeo por tipo (AJUSTA nombres si tu esquema real difiere)
if ($tipo === 'socio') {
    $tabla       = 'pagos';
    $colPK       = 'idPago';
    $colEntidad  = 'idSocios';
    $colMes      = 'idMes';
} else {
    $tabla       = 'pagos_empresas'; // cambia si tu tabla se llama distinto
    $colPK       = 'idPago';         // cambia si la PK se llama distinto
    $colEntidad  = 'idEmpresa';      // cambia si tu columna de empresa se llama distinto
    $colMes      = 'idMes';
}

// Si no llega ni idPago ni (id + idMes), error claro
if (empty($idPago) && (empty($id) || empty($idMes))) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'mensaje' => 'Faltan datos: envíe idPago o (id e idMes)']);
    exit;
}

try {
    $conn->begin_transaction();
    $afectados = 0;

    if (!empty($idPago)) {
        // Borra por PK
        $sql = "DELETE FROM {$tabla} WHERE {$colPK} = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $idPago);
        $stmt->execute();
        $afectados = $stmt->affected_rows;
        $stmt->close();
    } else {
        // Borra por (entidad, mes)
        $sql = "DELETE FROM {$tabla} WHERE {$colEntidad} = ? AND {$colMes} = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ii', $id, $idMes);
        $stmt->execute();
        $afectados = $stmt->affected_rows;
        $stmt->close();
    }

    if ($afectados <= 0) {
        $conn->rollback();
        echo json_encode(['ok' => false, 'mensaje' => 'No se encontró el pago a eliminar']);
        exit;
    }

    $conn->commit();
    echo json_encode(['ok' => true, 'mensaje' => 'Pago eliminado correctamente', 'eliminados' => $afectados]);

} catch (Throwable $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Error al eliminar: ' . $e->getMessage()]);
} finally {
    $conn->close();
}
