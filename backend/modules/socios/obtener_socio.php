<?php
// CORS + JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

// Responder preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once(__DIR__ . '/../../config/db.php');

// Forzar utf8mb4 si aplica
if (isset($conn) && $conn instanceof mysqli) {
    $conn->set_charset('utf8mb4');
}

$id       = isset($_GET['id']) ? intval($_GET['id']) : null;
$nombre   = isset($_GET['nombre'])   ? trim($_GET['nombre'])   : null;
$apellido = isset($_GET['apellido']) ? trim($_GET['apellido']) : null;

// SELECT base (mismas columnas en ambos caminos)
$selectBase = "
    SELECT 
        s.idSocios,
        s.nombre,
        s.apellido,
        s.DNI,
        s.domicilio,
        s.domicilio_2,
        s.numero,
        s.observacion,
        s.localidad,
        s.telefono,
        s.email,
        DATE_FORMAT(s.Fechaunion, '%Y-%m-%d') AS Fechaunion,
        s.idCategoria, 
        s.idMedios_Pago,

        -- ✅ NUEVO: campo para controlar recordatorios
        s.enviar_recordatorio,

        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago
    FROM socios s
    LEFT JOIN categorias c ON s.idCategoria = c.idCategorias
    LEFT JOIN mediospago m ON s.idMedios_Pago = m.IdMedios_pago
";

$stmt = null;

if ($id !== null) {
    $query = $selectBase . " WHERE s.idSocios = ? LIMIT 1";
    $stmt  = $conn->prepare($query);
    if ($stmt) $stmt->bind_param('i', $id);
} elseif ($nombre && $apellido) {
    $query = $selectBase . " WHERE s.nombre = ? AND s.apellido = ? LIMIT 1";
    $stmt  = $conn->prepare($query);
    if ($stmt) $stmt->bind_param('ss', $nombre, $apellido);
} else {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Faltan parámetros requeridos (id) o (nombre y apellido)."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al preparar la consulta."
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $result->num_rows > 0) {
        $socio = $result->fetch_assoc();

        // ✅ Normalizar enviar_recordatorio para evitar null raro:
        // - si viene NULL lo dejamos NULL (porque vos querés permitir NULL),
        //   pero el frontend lo puede tratar como 0.
        if (array_key_exists('enviar_recordatorio', $socio)) {
            if ($socio['enviar_recordatorio'] === null) {
                $socio['enviar_recordatorio'] = null;
            } else {
                $socio['enviar_recordatorio'] = (int)$socio['enviar_recordatorio']; // 0/1
            }
        } else {
            $socio['enviar_recordatorio'] = null;
        }

        // Catálogos (categorías y medios de pago)
        $categorias = [];
        $mediosPago = [];

        if ($catRes = $conn->query("SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias ORDER BY Nombre_categoria")) {
            $categorias = $catRes->fetch_all(MYSQLI_ASSOC);
            $catRes->free();
        }

        if ($mpRes = $conn->query("SELECT IdMedios_pago, Medio_Pago FROM mediospago ORDER BY Medio_Pago")) {
            $mediosPago = $mpRes->fetch_all(MYSQLI_ASSOC);
            $mpRes->free();
        }

        // Adjuntar catálogos al JSON (tal cual espera tu React)
        $socio['categorias'] = $categorias;
        $socio['mediosPago'] = $mediosPago;

        echo json_encode($socio, JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Socio no encontrado."
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al ejecutar la consulta.",
        "error" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} finally {
    if ($stmt) { $stmt->close(); }
    if (isset($conn) && $conn instanceof mysqli) { $conn->close(); }
}
