<?php
// Incluir la conexión a la base de datos
require_once(__DIR__ . '/../../config/db.php');

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

// Verificar si la tabla de pagos_empresas existe
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos_empresas'");
$tienePagos = ($checkPagosTable->num_rows > 0);

// Determinar el nombre correcto de la columna de relación con empresas
$columnaEmpresaPagos = 'idEmp'; // Valor por defecto
if ($tienePagos) {
    // Verificar las columnas existentes en la tabla pagos_empresas
    $columnasPagos = $conn->query("SHOW COLUMNS FROM pagos_empresas");
    while ($columna = $columnasPagos->fetch_assoc()) {
        if (in_array($columna['Field'], ['idEmp', 'idEmpresa', 'empresa_id'])) {
            $columnaEmpresaPagos = $columna['Field'];
            break;
        }
    }
}

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
        e.fechaunion AS Fechaunion,
        e.observacion,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago,
        i.descripcion AS descripcion_iva";

// Agregar meses pagados solo si la tabla de pagos_empresas existe
if ($tienePagos) {
    $query .= ",
        GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ', ') as meses_pagados";
}

$query .= "
    FROM 
        empresas e
    LEFT JOIN 
        categorias c ON e.idCategorias = c.idCategorias
    LEFT JOIN 
        mediospago m ON e.idMedios_Pago = m.IdMedios_pago
    LEFT JOIN 
        condicional_iva i ON e.id_iva = i.id_iva";

// Agregar JOIN con pagos_empresas solo si la tabla existe
if ($tienePagos) {
    $query .= "
    LEFT JOIN
        pagos_empresas p ON e.idEmp = p.{$columnaEmpresaPagos}";
}

$query .= "
    GROUP BY
        e.idEmp
    ORDER BY 
        e.razon_social ASC";

$stmt = $conn->prepare($query);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error en la preparación de la consulta: " . $conn->error,
        "query" => $query, // Para depuración
        "empresas" => []
    ]);
    exit;
}

$stmt->execute();
$result = $stmt->get_result();

$empresas = [];
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
    $empresas[] = $row;
}

$stmt->close();

// Obtener todas las categorías y medios de pago disponibles
function obtenerCategoriasYMediosPago($conn) {
    $data = [
        "categorias" => [],
        "mediosPago" => []
    ];
    
    // Obtener categorías
    $categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias";
    if ($result = $conn->query($categoriasQuery)) {
        while ($row = $result->fetch_assoc()) {
            $data["categorias"][] = $row;
        }
    }

    // Obtener medios de pago
    $mediosPagoQuery = "SELECT IdMedios_pago, Medio_Pago FROM mediospago";
    if ($result = $conn->query($mediosPagoQuery)) {
        while ($row = $result->fetch_assoc()) {
            $data["mediosPago"][] = $row;
        }
    }

    return $data;
}

$extraData = obtenerCategoriasYMediosPago($conn);

// Nombres de meses para el frontend
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
    "success" => true,
    "empresas" => $empresas,
    "categorias" => $extraData["categorias"],
    "mediosPago" => $extraData["mediosPago"],
    "meses" => $nombresMeses,
    "tienePagos" => $tienePagos
]);

$conn->close();
?>