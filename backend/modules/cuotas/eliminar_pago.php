<?php
/**
 * backend/modules/cuotas/eliminar_pago.php
 * Elimina un pago de socio o de empresa.
 * - Mantiene la lógica de socios (tabla "pagos")
 * - Corrige empresas autodetectando columnas (id de pago, id de empresa, id de periodo)
 */

header('Content-Type: application/json');

// (Opcional) ver errores "reales"
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once(__DIR__ . '/../../config/db.php'); 
if (!isset($conn) || !($conn instanceof mysqli)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Conexión a BD no disponible']);
    exit;
}

try { $conn->set_charset("utf8mb4"); } catch (Throwable $e) {}

/* ==========================
   Helpers
========================== */

/**
 * Devuelve el primer nombre de columna existente en $tabla que coincida con $candidates.
 * Si no encuentra ninguno, devuelve null.
 */
function pickFirstExisting(mysqli $conn, string $tabla, array $candidates): ?string {
    $cols = [];
    $res = $conn->query("SHOW COLUMNS FROM `$tabla`");
    while ($row = $res->fetch_assoc()) {
        $cols[] = $row['Field'];
    }
    foreach ($candidates as $c) {
        if (in_array($c, $cols, true)) return $c;
    }
    return null;
}

/**
 * Prepara y ejecuta un DELETE en $tabla con WHERE por PK (id de pago).
 * $pkCol puede ser id_pago, idPago, id_pago_emp, etc.
 */
function deleteByPK(mysqli $conn, string $tabla, string $pkCol, int $idPago): int {
    $sql  = "DELETE FROM `$tabla` WHERE `$pkCol` = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $idPago);
    $stmt->execute();
    $af = $stmt->affected_rows;
    $stmt->close();
    return $af;
}

/**
 * Prepara y ejecuta un DELETE en $tabla con WHERE por (entidad, periodo).
 * $entCol = id_socio / idSocios / id_emp / idEmpresa / id_empresa, etc.
 * $perCol = id_periodo / idMes / id_mes, etc.
 */
function deleteByEntidadPeriodo(mysqli $conn, string $tabla, string $entCol, string $perCol, int $id, int $idMes): int {
    $sql  = "DELETE FROM `$tabla` WHERE `$entCol` = ? AND `$perCol` = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ii', $id, $idMes);
    $stmt->execute();
    $af = $stmt->affected_rows;
    $stmt->close();
    return $af;
}

/* ==========================
   Validación de método
========================== */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'mensaje' => 'Método no permitido']);
    exit;
}

/* ==========================
   Leer input
========================== */

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data) || empty($data)) { $data = $_POST; }

$tipo    = isset($data['tipo'])    ? trim((string)$data['tipo']) : '';
$mesTxt  = isset($data['mes'])     ? trim((string)$data['mes'])  : ''; // informativo si ya llega idMes
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

/* ==========================
   Definición de tablas y columnas (con autodetección)
========================== */

$tablaSocios    = 'pagos';           // ← nombre de la tabla de pagos de socios
$tablaEmpresas  = 'pagos_empresas';  // ← CAMBIAR si tu tabla real se llama distinto

try {
    $conn->begin_transaction();

    $afectados = 0;

    if ($tipo === 'socio') {
        // Socios: mantenemos compatibilidad con tu esquema.
        // Intentamos detectar nombres reales por si difieren.
        $pkSoc     = pickFirstExisting($conn, $tablaSocios, ['id_pago', 'idPago']);
        $entSoc    = pickFirstExisting($conn, $tablaSocios, ['id_socio', 'idSocios']);
        $periodSoc = pickFirstExisting($conn, $tablaSocios, ['id_periodo', 'idMes', 'id_mes']);

        // Fallbacks razonables si SHOW COLUMNS falla (no debería)
        if ($pkSoc === null)     { $pkSoc = 'id_pago'; }
        if ($entSoc === null)    { $entSoc = 'id_socio'; }
        if ($periodSoc === null) { $periodSoc = 'id_periodo'; }

        if (!empty($idPago)) {
            $afectados = deleteByPK($conn, $tablaSocios, $pkSoc, $idPago);
        } else {
            if (empty($id) || empty($idMes)) {
                $conn->rollback();
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'Faltan "id" y/o "idMes" para eliminar pago de socio']);
                exit;
            }
            $afectados = deleteByEntidadPeriodo($conn, $tablaSocios, $entSoc, $periodSoc, $id, $idMes);
        }

        if ($afectados <= 0) {
            $conn->rollback();
            echo json_encode(['ok' => false, 'mensaje' => 'No se encontró el pago de socio a eliminar']);
            exit;
        }

        $conn->commit();
        echo json_encode(['ok' => true, 'mensaje' => 'Pago de socio eliminado correctamente', 'eliminados' => $afectados]);
        exit;
    }

    if ($tipo === 'empresa') {
        // Empresas: corregimos el error "Unknown column 'idEmpresa'..."
        // Autodetectamos nombres reales de columnas.
        $pkEmp     = pickFirstExisting($conn, $tablaEmpresas, ['id_pago', 'idPago', 'id_pago_emp', 'idPagoEmp']);
        $entEmp    = pickFirstExisting($conn, $tablaEmpresas, ['id_emp', 'idEmpresa', 'id_empresa', 'idEmp']);
        $periodEmp = pickFirstExisting($conn, $tablaEmpresas, ['id_periodo', 'idMes', 'id_mes']);

        // Fallbacks por si no se pudieron leer columnas (evita romper)
        if ($pkEmp === null)     { $pkEmp = 'id_pago'; }
        if ($entEmp === null)    { $entEmp = 'id_emp'; }
        if ($periodEmp === null) { $periodEmp = 'id_periodo'; }

        if (!empty($idPago)) {
            $afectados = deleteByPK($conn, $tablaEmpresas, $pkEmp, $idPago);
        } else {
            if (empty($id) || empty($idMes)) {
                $conn->rollback();
                http_response_code(400);
                echo json_encode(['ok' => false, 'mensaje' => 'Faltan "id" y/o "idMes" para eliminar pago de empresa']);
                exit;
            }
            $afectados = deleteByEntidadPeriodo($conn, $tablaEmpresas, $entEmp, $periodEmp, $id, $idMes);
        }

        if ($afectados <= 0) {
            $conn->rollback();
            echo json_encode(['ok' => false, 'mensaje' => 'No se encontró el pago de empresa a eliminar']);
            exit;
        }

        $conn->commit();
        echo json_encode(['ok' => true, 'mensaje' => 'Pago de empresa eliminado correctamente', 'eliminados' => $afectados]);
        exit;
    }

    // No debería llegar acá
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['ok' => false, 'mensaje' => 'Tipo inválido']);

} catch (Throwable $e) {
    // Si algo falla, devolvemos el error real de BD/servidor
    if ($conn && $conn->errno === 0) {
        // Evita "Commands out of sync" si ya está cerrada la transacción
        try { $conn->rollback(); } catch (Throwable $ignored) {}
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Error al eliminar: ' . $e->getMessage()]);
} finally {
    if ($conn) { $conn->close(); }
}
