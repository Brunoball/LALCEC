<?php
// modules/socios/obtener_datos_socios.php

// CORS + JSON
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// DB
include_once(__DIR__ . '/../../config/db.php');

// (solo para desarrollo; desactivar en prod)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ¿Existe la tabla pagos?
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
$tienePagos = ($checkPagosTable && $checkPagosTable->num_rows > 0);

// Si existe, detectamos el nombre correcto de la FK: idSocios o idSocio
$columnaPagos = 'idSocios';
if ($tienePagos) {
    $checkColumn = $conn->query("SHOW COLUMNS FROM pagos LIKE 'idSocio'");
    if ($checkColumn && $checkColumn->num_rows > 0) {
        $columnaPagos = 'idSocio';
    }
}

// Base SELECT
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

if ($tienePagos) {
    $query .= ",
        GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',') AS meses_pagados";
}

$query .= "
    FROM socios s
    LEFT JOIN categorias c   ON s.idCategoria   = c.idCategorias
    LEFT JOIN mediospago m   ON s.idMedios_Pago = m.IdMedios_pago";

if ($tienePagos) {
    $query .= "
    LEFT JOIN pagos p ON s.idSocios = p.$columnaPagos";
}

// ⚠️ Filtramos solo activos
$query .= "
    WHERE s.activo = 1";

if ($tienePagos) {
    $query .= "
    GROUP BY s.idSocios";
}

$query .= "
    ORDER BY s.apellido ASC, s.nombre ASC";

$result = $conn->query($query);

// Meses
$nombresMesesArray = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

$mesActual  = (int)date("n");
$anioActual = (int)date("Y");

$socios = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        // Transformar ids de meses a nombres
        $mesesPagados = [];
        if ($tienePagos && !empty($row['meses_pagados'])) {
            foreach (explode(',', $row['meses_pagados']) as $mesId) {
                $mesId = (int)$mesId;
                if (isset($nombresMesesArray[$mesId])) {
                    $mesesPagados[] = $nombresMesesArray[$mesId];
                }
            }
        }

        // Calcular estado de pago
        $estado = 'rojo';
        if (!empty($row['Fechaunion'])) {
            $fechaUnion = new DateTime($row['Fechaunion']);
            $anioUnion  = (int)$fechaUnion->format("Y");
            $mesUnion   = (int)$fechaUnion->format("n");

            $mesesEsperados = [];
            for ($a = $anioUnion; $a <= $anioActual; $a++) {
                $desde = ($a === $anioUnion) ? $mesUnion : 1;
                $hasta = ($a === $anioActual) ? $mesActual : 12;
                for ($m = $desde; $m <= $hasta; $m++) {
                    $nombreMes = $nombresMesesArray[$m];
                    if (!in_array($nombreMes, $mesesEsperados, true)) {
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
        $row['estado_pago']   = $estado;

        $socios[] = $row;
    }
} else {
    echo json_encode(["message" => "Error al ejecutar la consulta: " . $conn->error, "socios" => []]);
    $conn->close();
    exit;
}

// Listas auxiliares
function obtenerCategoriasYMediosPago($conn) {
    $categorias = [];
    if ($res = $conn->query("SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias")) {
        while ($row = $res->fetch_assoc()) $categorias[] = $row;
    }

    $mediosPago = [];
    if ($res = $conn->query("SELECT IdMedios_pago, Medio_Pago FROM mediospago")) {
        while ($row = $res->fetch_assoc()) $mediosPago[] = $row;
    }

    return ["categorias" => $categorias, "mediosPago" => $mediosPago];
}

$extraData = obtenerCategoriasYMediosPago($conn);

// Meses (para combos)
$meses = [];
foreach ($nombresMesesArray as $id => $nombre) {
    $meses[] = ["id" => $id, "nombre" => ucfirst(strtolower($nombre))];
}

// Respuesta
echo json_encode([
    "socios"     => $socios,                 // opcional si la pantalla no lo usa
    "categorias" => $extraData["categorias"],
    "mediosPago" => $extraData["mediosPago"],
    "meses"      => $meses,
    "tienePagos" => $tienePagos
]);

$conn->close();
