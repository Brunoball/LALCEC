<?php
// Incluir la conexión a la base de datos
include_once(__DIR__ . '/../../config/db.php');

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

// Verificar si la tabla de pagos existe y tiene datos
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
$tienePagos = ($checkPagosTable->num_rows > 0);

// Obtener todos los socios y empresas (ya no se filtra por tipo)
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
        s.Fechaunion,
        s.telefono,
        s.email,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago";

// Agregar meses pagados solo si la tabla de pagos existe
if ($tienePagos) {
    $query .= ",
        GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',') as meses_pagados";
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
    $checkColumn = $conn->query("SHOW COLUMNS FROM pagos LIKE 'idSocios'");
    $columnaPagos = ($checkColumn->num_rows > 0) ? 'idSocios' : 'idSocio';
    $query .= "
    LEFT JOIN
        pagos p ON s.idSocios = p.{$columnaPagos}";
}

if ($tienePagos) {
    $query .= "
    GROUP BY
        s.idSocios";
}

$query .= "
    ORDER BY 
        s.apellido ASC, s.nombre ASC";

$result = $conn->query($query);

$nombresMesesArray = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

$mesActual = (int)date("n");
$anioActual = (int)date("Y");

$socios = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $mesesPagados = [];
        if ($tienePagos && !empty($row['meses_pagados'])) {
            $idsMes = explode(',', $row['meses_pagados']);
            foreach ($idsMes as $mesId) {
                $mesId = (int)$mesId;
                if (isset($nombresMesesArray[$mesId])) {
                    $mesesPagados[] = $nombresMesesArray[$mesId];
                }
            }
        }

        $estado = 'rojo';
        if (!empty($row['Fechaunion'])) {
            $fechaUnion = new DateTime($row['Fechaunion']);
            $anioUnion = (int)$fechaUnion->format("Y");
            $mesUnion = (int)$fechaUnion->format("n");

            $mesesEsperados = [];
            for ($a = $anioUnion; $a <= $anioActual; $a++) {
                $desde = ($a === $anioUnion) ? $mesUnion : 1;
                $hasta = ($a === $anioActual) ? $mesActual : 12;

                for ($m = $desde; $m <= $hasta; $m++) {
                    $nombreMes = $nombresMesesArray[$m];
                    if (!in_array($nombreMes, $mesesEsperados)) {
                        $mesesEsperados[] = $nombreMes;
                    }
                }
            }

            $impagos = array_diff($mesesEsperados, $mesesPagados);

            if (count($impagos) === 0) {
                $estado = 'verde';
            } elseif (count($impagos) <= 2) {
                $estado = 'amarillo';
            } else {
                $estado = 'rojo';
            }
        }

        $row['meses_pagados'] = implode(', ', $mesesPagados);
        $row['estado_pago'] = $estado;

        $socios[] = $row;
    }
} else {
    echo json_encode(["message" => "Error al ejecutar la consulta: " . $conn->error, "socios" => []]);
    $conn->close();
    exit;
}

function obtenerCategoriasYMediosPago($conn) {
    $categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias";
    $categoriasResult = $conn->query($categoriasQuery);
    $categorias = [];
    while ($row = $categoriasResult->fetch_assoc()) {
        $categorias[] = $row;
    }

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

$nombresMeses = [];
foreach ($nombresMesesArray as $id => $nombre) {
    $nombresMeses[] = ["id" => $id, "nombre" => ucfirst(strtolower($nombre))];
}

echo json_encode([
    "socios" => $socios,
    "categorias" => $extraData["categorias"],
    "mediosPago" => $extraData["mediosPago"],
    "meses" => $nombresMeses,
    "tienePagos" => $tienePagos
]);

$conn->close();