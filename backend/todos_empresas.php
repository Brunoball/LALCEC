<?php
// Incluir la conexión a la base de datos
include(__DIR__ . '/db.php');

// Mostrar errores (desactiva en producción)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Encabezados para CORS
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Manejo de preflight request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener el tipo de entidad desde la URL (socios o empresas)
$tipo = $_GET['tipo'] ?? 'empresas'; // Default a 'empresas'

// Obtener todas las empresas
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
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago,
        i.descripcion AS descripcion_iva
    FROM 
        empresas e
    LEFT JOIN 
        categorias c ON e.idCategorias = c.idCategorias
    LEFT JOIN 
        mediospago m ON e.idMedios_Pago = m.IdMedios_pago
    LEFT JOIN 
        condicional_iva i ON e.id_iva = i.id_iva
    ORDER BY 
        e.razon_social ASC
";

$stmt = $conn->prepare($query);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "message" => "Error en la preparación de la consulta: " . $conn->error,
        "empresas" => []
    ]);
    exit;
}

$stmt->execute();
$result = $stmt->get_result();

$empresas = [];
while ($row = $result->fetch_assoc()) {
    $empresas[] = $row;
}

$stmt->close();

// Obtener todas las categorías y medios de pago disponibles
function obtenerCategoriasYMediosPago($conn) {
    // Obtener todas las categorías disponibles con su precio
    $categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias";
    $categoriasResult = $conn->query($categoriasQuery);
    $categorias = [];
    while ($row = $categoriasResult->fetch_assoc()) {
        $categorias[] = $row;
    }

    // Obtener todos los medios de pago disponibles
    $mediosPagoQuery = "SELECT IdMedios_pago, Medio_Pago FROM mediospago";
    $mediosPagoResult = $conn->query($mediosPagoQuery);
    $mediosPago = [];
    while ($row = $mediosPagoResult->fetch_assoc()) {
        $mediosPago[] = $row;
    }

    return [
        "categorias" => $categorias,
        "mediosPago" => $mediosPago
    ];
}

$extraData = obtenerCategoriasYMediosPago($conn);

echo json_encode([
    "empresas" => $empresas,
    "categorias" => $extraData["categorias"],
    "mediosPago" => $extraData["mediosPago"]
]);

$conn->close();
?>