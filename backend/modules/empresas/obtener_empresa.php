<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once(__DIR__ . '/../../config/db.php');

$razon_social = isset($_GET['razon_social']) ? trim($_GET['razon_social']) : null;

if (!$razon_social) {
    http_response_code(400);
    echo json_encode(["message" => "Falta el parámetro razon_social"], JSON_UNESCAPED_UNICODE);
    exit();
}

/*
 Estructura de agenda.empresas:
 idEmp (PK), razon_social, cuit, domicilio, telefono, email, observacion,
 idCategorias, idMedios_Pago, domicilio_2, id_iva, fechaunion, activo, motivo
*/

$query = "
    SELECT 
        e.idEmp,
        e.razon_social,
        e.cuit,
        e.domicilio,
        e.domicilio_2,
        e.telefono,
        e.email,
        e.observacion,
        e.idCategorias,
        e.idMedios_Pago,
        e.id_iva,
        DATE_FORMAT(e.fechaunion, '%Y-%m-%d') AS fechaunion,  -- <-- importante
        e.activo,
        e.motivo,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        iva.descripcion AS descripcion_iva
    FROM empresas e
    LEFT JOIN categorias c       ON e.idCategorias   = c.idCategorias
    LEFT JOIN condicional_iva iva ON e.id_iva         = iva.id_iva
    WHERE e.razon_social = ?
    LIMIT 1
";

if (!($stmt = $conn->prepare($query))) {
    http_response_code(500);
    echo json_encode(["message" => "Error al preparar la consulta de empresa"], JSON_UNESCAPED_UNICODE);
    exit();
}

$stmt->bind_param('s', $razon_social);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["message" => "Empresa no encontrada"], JSON_UNESCAPED_UNICODE);
    $stmt->close();
    $conn->close();
    exit();
}

$empresa = $result->fetch_assoc();
$stmt->close();

/* ----- Listas auxiliares para los selects ----- */

// Categorías
$categorias = [];
$categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias ORDER BY Nombre_categoria ASC";
if ($rs = $conn->query($categoriasQuery)) {
    while ($row = $rs->fetch_assoc()) $categorias[] = $row;
    $rs->close();
}

// Medios de pago
$mediosPago = [];
$mediosPagoQuery = "SELECT IdMedios_pago, Medio_Pago FROM mediospago ORDER BY Medio_Pago ASC";
if ($rs = $conn->query($mediosPagoQuery)) {
    while ($row = $rs->fetch_assoc()) $mediosPago[] = $row;
    $rs->close();
}

// Condiciones de IVA
$condicionesIva = [];
$condIvaQuery = "SELECT id_iva, descripcion FROM condicional_iva ORDER BY descripcion ASC";
if ($rs = $conn->query($condIvaQuery)) {
    while ($row = $rs->fetch_assoc()) $condicionesIva[] = $row;
    $rs->close();
}

/* ----- Armar respuesta final (mismo shape que espera el frontend) ----- */
$empresa['categorias']      = $categorias;
$empresa['mediosPago']      = $mediosPago;
$empresa['condicionesIva']  = $condicionesIva;

echo json_encode($empresa, JSON_UNESCAPED_UNICODE);

$conn->close();
