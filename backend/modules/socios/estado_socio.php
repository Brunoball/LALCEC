<?php
/**
 * backend/modules/socios/estado_socio.php
 *
 * Endpoints:
 * - GET  action=estado_socio&op=listar_baja
 * - POST action=estado_socio&op=dar_baja   { idSocio | id_socio, motivo }
 * - POST action=estado_socio&op=dar_alta   { idSocio | id_socio }
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/db.php'; // <-- usa $conn (mysqli)
$conn->set_charset("utf8mb4");

$op = $_GET['op'] ?? null;

try {
    switch ($op) {
        /* ===========================================================
         * LISTAR socios dados de baja (activo = 0)
         * Devuelve: id_socio, nombre, apellido, fecha_union (Fechaunion), motivo
         * Además, por compatibilidad, devuelve fecha_baja = Fechaunion
         * =========================================================== */
        case 'listar_baja': {
            $sql = "
                SELECT 
                    s.idSocios       AS id_socio,
                    s.Nombre         AS nombre,
                    s.Apellido       AS apellido,
                    s.Fechaunion     AS fecha_union,
                    s.motivo         AS motivo
                FROM socios s
                WHERE COALESCE(s.activo, 0) = 0
                ORDER BY s.Apellido, s.Nombre
            ";
            $res = $conn->query($sql);
            if ($res === false) {
                throw new Exception("Error al consultar socios de baja: " . $conn->error);
            }

            $socios = [];
            while ($row = $res->fetch_assoc()) {
                $socios[] = [
                    'id_socio'    => (int)$row['id_socio'],
                    'nombre'      => $row['nombre'] ?? '',
                    'apellido'    => $row['apellido'] ?? '',
                    // Fecha de unión en dos claves: una estándar y otra para compatibilidad con tu UI actual
                    'Fechaunion'  => $row['fecha_union'],      // por si querés usar el nombre exacto de la columna
                    'fecha_union' => $row['fecha_union'],      // camel/snake limpio para FE nuevo
                    'fecha_baja'  => $row['fecha_union'],      // compat: si tu UI lee "fecha_baja", no rompe
                    'motivo'      => $row['motivo'] ?? null,
                ];
            }

            echo json_encode([
                'exito'  => true,
                'socios' => $socios
            ]);
            exit;
        }

        /* ===========================================================
         * DAR DE BAJA (opcional, por si lo usás)
         * Body JSON: { id_socio | idSocios, motivo }
         * =========================================================== */
        case 'dar_baja': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['exito' => false, 'mensaje' => 'Método no permitido']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $id    = $input['id_socio'] ?? $input['idSocios'] ?? null;
            $motivo = trim($input['motivo'] ?? '');

            if (!$id) {
                http_response_code(400);
                echo json_encode(['exito' => false, 'mensaje' => 'Falta id_socio']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE socios SET activo = 0, motivo = ? WHERE idSocios = ?");
            if (!$stmt) {
                throw new Exception("Error al preparar consulta: " . $conn->error);
            }
            $stmt->bind_param('si', $motivo, $id);
            if (!$stmt->execute()) {
                throw new Exception("No se pudo dar de baja al socio");
            }

            echo json_encode(['exito' => true, 'mensaje' => 'Socio dado de baja correctamente']);
            exit;
        }

        /* ===========================================================
         * DAR DE ALTA
         * Body JSON: { id_socio | idSocios }
         * - Pone activo = 1
         * - Limpia motivo
         * =========================================================== */
        case 'dar_alta': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['exito' => false, 'mensaje' => 'Método no permitido']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $id    = $input['id_socio'] ?? $input['idSocios'] ?? null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(['exito' => false, 'mensaje' => 'Falta id_socio']);
                exit;
            }

            $stmt = $conn->prepare("UPDATE socios SET activo = 1, motivo = NULL WHERE idSocios = ?");
            if (!$stmt) {
                throw new Exception("Error al preparar consulta: " . $conn->error);
            }
            $stmt->bind_param('i', $id);
            if (!$stmt->execute()) {
                throw new Exception("No se pudo dar de alta al socio");
            }

            echo json_encode(['exito' => true, 'mensaje' => 'Socio dado de alta correctamente']);
            exit;
        }

        default:
            http_response_code(400);
            echo json_encode(['exito' => false, 'mensaje' => 'Operación no válida']);
            exit;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error del servidor: ' . $e->getMessage()
    ]);
    exit;
}
