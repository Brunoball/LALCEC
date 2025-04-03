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
$tipo = $_GET['tipo'] ?? 'socios'; // Default a 'socios'

// Determinar el valor de flag según el tipo de entidad
$flag = ($tipo === 'empresa') ? 1 : 0;

// Verificar si la tabla de pagos existe y tiene datos
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
$tienePagos = ($checkPagosTable->num_rows > 0);

// Obtener todos los socios o empresas según el tipo de entidad
$query = "
    SELECT 
        s.idSocios AS id,
        s.nombre,
        s.apellido,
        s.DNI,
        s.domicilio,
        s.numero,
        s.domicilio_2,
        s.observacion,
        s.localidad,
        s.telefono,
        s.email,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago";

// Agregar meses pagados solo si la tabla de pagos existe
if ($tienePagos) {
    $query .= ",
        GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ', ') as meses_pagados";
}

$query .= "
    FROM 
        socios s
    LEFT JOIN 
        categorias c ON s.idCategoria = c.idCategorias
    LEFT JOIN 
        mediospago m ON s.idMedios_Pago = m.IdMedios_pago";

// Agregar JOIN con pagos solo si la tabla existe
if ($tienePagos) {
    // Verificar el nombre correcto de la columna (idSocio o idSocios)
    $checkColumn = $conn->query("SHOW COLUMNS FROM pagos LIKE 'idSocios'");
    $columnaPagos = ($checkColumn->num_rows > 0) ? 'idSocios' : 'idSocio';
    
    $query .= "
    LEFT JOIN
        pagos p ON s.idSocios = p.{$columnaPagos}";
}

$query .= "
    WHERE 
        s.flag = ?";

// Agregar GROUP BY solo si se incluyó la tabla de pagos
if ($tienePagos) {
    $query .= "
    GROUP BY
        s.idSocios";
}

$query .= "
    ORDER BY 
        s.apellido ASC, s.nombre ASC";

$stmt = $conn->prepare($query);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "message" => "Error en la preparación de la consulta: " . $conn->error,
        "socios" => []
    ]);
    exit;
}

$stmt->bind_param('i', $flag);
$stmt->execute();
$result = $stmt->get_result();

$socios = [];
while ($row = $result->fetch_assoc()) {
    // Procesar meses pagados si existen
    if ($tienePagos) {
        if (!empty($row['meses_pagados'])) {
            $mesesNumeros = explode(', ', $row['meses_pagados']);
            $mesesNombres = array_map(function($mes) {
                $nombresMeses = [
                    1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
                    5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
                    9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
                ];
                return $nombresMeses[(int)$mes] ?? $mes;
            }, $mesesNumeros);
            $row['meses_pagados'] = implode(', ', $mesesNombres);
        } else {
            $row['meses_pagados'] = '-';
        }
    } else {
        $row['meses_pagados'] = 'No disponible';
    }
    $socios[] = $row;
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

// Obtener nombres de meses para mostrar en el frontend si es necesario
$nombresMeses = [
    ['id' => 1, 'nombre' => 'Enero'],
    ['id' => 2, 'nombre' => 'Febrero'],
    ['id' => 3, 'nombre' => 'Marzo'],
    ['id' => 4, 'nombre' => 'Abril'],
    ['id' => 5, 'nombre' => 'Mayo'],
    ['id' => 6, 'nombre' => 'Junio'],
    ['id' => 7, 'nombre' => 'Julio'],
    ['id' => 8, 'nombre' => 'Agosto'],
    ['id' => 9, 'nombre' => 'Septiembre'],
    ['id' => 10, 'nombre' => 'Octubre'],
    ['id' => 11, 'nombre' => 'Noviembre'],
    ['id' => 12, 'nombre' => 'Diciembre']
];

echo json_encode([
    "socios" => $socios,
    "categorias" => $extraData["categorias"],
    "mediosPago" => $extraData["mediosPago"],
    "meses" => $nombresMeses,
    "tienePagos" => $tienePagos
]);

$conn->close();
?>