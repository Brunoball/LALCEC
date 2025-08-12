<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Ajustá el include a tu conexión real:
require_once(__DIR__ . '/../../config/db.php'); // define $conn (mysqli)

$method = $_SERVER['REQUEST_METHOD'];

// Leer JSON si es POST
$input = null;
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $input = json_decode($raw, true);
    }
}

$op = $_GET['op'] ?? null;

function resp($ok, $mensaje, $extra = []) {
    echo json_encode(array_merge([
        'success' => (bool)$ok,
        'mensaje' => $mensaje
    ], $extra));
    exit;
}

if (!$op) {
    resp(false, 'Parámetro op requerido');
}

switch ($op) {

    // ===== LISTAR EMPRESAS DADAS DE BAJA =====
    case 'listar_baja':
        // Usamos fechaunion como "fecha de baja" y la exponemos como fecha_baja
        $sql = "SELECT 
                    e.idEmp AS id_empresa,
                    e.razon_social,
                    e.fechaunion AS fecha_baja,
                    e.motivo
                FROM empresas e
                WHERE e.activo = 0
                ORDER BY e.fechaunion DESC, e.razon_social ASC";
        $res = $conn->query($sql);
        if (!$res) {
            resp(false, 'Error al listar empresas dadas de baja: ' . $conn->error);
        }
        $empresas = [];
        while ($row = $res->fetch_assoc()) {
            $empresas[] = $row;
        }
        resp(true, 'OK', ['empresas' => $empresas]);

    // ===== DAR DE BAJA EMPRESA =====
    case 'dar_baja':
        if ($method !== 'POST') {
            resp(false, 'Método no permitido');
        }
        $id = $input['id_empresa'] ?? null;
        $motivo = trim($input['motivo'] ?? '');
        if (!$id || $motivo === '') {
            resp(false, 'id_empresa y motivo son obligatorios');
        }

        // Chequear existencia y estado actual
        $stmt = $conn->prepare("SELECT activo FROM empresas WHERE idEmp = ?");
        if (!$stmt) resp(false, 'Error de preparación: ' . $conn->error);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->bind_result($activo);
        if (!$stmt->fetch()) {
            $stmt->close();
            resp(false, 'Empresa no encontrada');
        }
        $stmt->close();

        if ((int)$activo === 0) {
            resp(false, 'La empresa ya está dada de baja');
        }

        // Actualizar baja:
        // - activo = 0
        // - motivo = provisto (en mayúsculas)
        // - fechaunion = CURDATE()  (usada como fecha de baja)
        $motivoUpper = mb_strtoupper($motivo, 'UTF-8');

        $stmt = $conn->prepare("UPDATE empresas 
                                SET activo = 0, fechaunion = CURDATE(), motivo = ? 
                                WHERE idEmp = ?");
        if (!$stmt) resp(false, 'Error de preparación: ' . $conn->error);
        $stmt->bind_param('si', $motivoUpper, $id);
        if (!$stmt->execute()) {
            $err = $stmt->error ?: $conn->error;
            $stmt->close();
            resp(false, 'No se pudo dar de baja: ' . $err);
        }
        $stmt->close();
        resp(true, 'Empresa dada de baja correctamente');

    // ===== DAR DE ALTA EMPRESA =====
    case 'dar_alta':
        if ($method !== 'POST') {
            resp(false, 'Método no permitido');
        }
        $id = $input['id_empresa'] ?? null;
        // Motivo opcional al dar de alta (p.ej. "reingreso"); si viene, se guarda en MAYÚSCULAS
        $motivoAlta = isset($input['motivo']) ? trim((string)$input['motivo']) : null;

        if (!$id) {
            resp(false, 'id_empresa es obligatorio');
        }

        // Chequear existencia
        $stmt = $conn->prepare("SELECT activo FROM empresas WHERE idEmp = ?");
        if (!$stmt) resp(false, 'Error de preparación: ' . $conn->error);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->bind_result($activo);
        if (!$stmt->fetch()) {
            $stmt->close();
            resp(false, 'Empresa no encontrada');
        }
        $stmt->close();

        if ((int)$activo === 1) {
            resp(false, 'La empresa ya está activa');
        }

        // Dar de alta:
        // - activo = 1
        // - fechaunion = CURDATE()  (usada como fecha de alta)
        // - motivo = NULL si no se envía; si se envía, guardar en MAYÚSCULAS
        if ($motivoAlta !== null && $motivoAlta !== '') {
            $motivoAltaUpper = mb_strtoupper($motivoAlta, 'UTF-8');
            $stmt = $conn->prepare("UPDATE empresas 
                                    SET activo = 1, fechaunion = CURDATE(), motivo = ? 
                                    WHERE idEmp = ?");
            if (!$stmt) resp(false, 'Error de preparación: ' . $conn->error);
            $stmt->bind_param('si', $motivoAltaUpper, $id);
        } else {
            $stmt = $conn->prepare("UPDATE empresas 
                                    SET activo = 1, fechaunion = CURDATE(), motivo = NULL 
                                    WHERE idEmp = ?");
            if (!$stmt) resp(false, 'Error de preparación: ' . $conn->error);
            $stmt->bind_param('i', $id);
        }

        if (!$stmt->execute()) {
            $err = $stmt->error ?: $conn->error;
            $stmt->close();
            resp(false, 'No se pudo dar de alta: ' . $err);
        }
        $stmt->close();
        resp(true, 'Empresa dada de alta correctamente');

    default:
        resp(false, 'Operación no soportada');
}
