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

// Función para obtener categorías y medios de pago
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

// Obtener todos los socios
// Obtener todos los socios ordenados por apellido y luego por nombre
$query = "
    SELECT 
        s.idSocios,
        s.nombre,
        s.apellido,
        s.DNI,
        s.domicilio,
        s.numero,
        s.observacion,
        s.localidad,
        s.telefono,
        s.email,
        s.idCategoria, 
        s.idMedios_Pago,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,  -- Aquí se obtiene el precio de la categoría
        m.Medio_Pago AS medio_pago
    FROM 
        socios s
    LEFT JOIN 
        categorias c ON s.idCategoria = c.idCategorias
    LEFT JOIN 
        mediospago m ON s.idMedios_Pago = m.IdMedios_pago
    ORDER BY 
        s.apellido ASC, s.nombre ASC
";

$result = $conn->query($query);
if ($result) {
    $socios = [];
    while ($row = $result->fetch_assoc()) {
        $socios[] = $row;
    }

    $extraData = obtenerCategoriasYMediosPago($conn);

    echo json_encode([
        "socios" => $socios,
        "categorias" => $extraData["categorias"],
        "mediosPago" => $extraData["mediosPago"]
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "message" => "Error al obtener los socios",
        "categorias" => [],
        "mediosPago" => []
    ]);
}

$conn->close();
?>
