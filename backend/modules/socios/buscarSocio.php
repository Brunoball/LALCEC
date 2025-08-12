<?php
// modules/socios/buscar_socio.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once(__DIR__ . '/../../config/db.php');

// (solo para desarrollo; desactivar en prod)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$busqueda = $_GET['busqueda'] ?? null;
if (!$busqueda) {
    http_response_code(400);
    echo json_encode(["message" => "Falta el parámetro de búsqueda"]);
    exit;
}

// Detectar nombre de columna FK en pagos
$columnaPagos = 'idSocios';
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
$tienePagos = ($checkPagosTable && $checkPagosTable->num_rows > 0);
if ($tienePagos) {
    $checkCol = $conn->query("SHOW COLUMNS FROM pagos LIKE 'idSocio'");
    if ($checkCol && $checkCol->num_rows > 0) $columnaPagos = 'idSocio';
}

// Meses
$nombresMeses = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

// SELECT con subquery para meses (si existe pagos)
$selectMeses = $tienePagos
    ? ", (SELECT GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',')
         FROM pagos p
         WHERE p.$columnaPagos = s.idSocios) AS meses_pagados"
    : ", NULL AS meses_pagados";

$sql = "
    SELECT 
        s.idSocios AS idSocios,
        s.nombre,
        s.apellido,
        s.Fechaunion,
        s.domicilio_2,
        s.observacion,
        c.Nombre_categoria  AS categoria,
        c.Precio_Categoria  AS precio_categoria,
        m.Medio_Pago        AS medio_pago
        $selectMeses
    FROM socios s
    LEFT JOIN categorias  c ON s.idCategoria   = c.idCategorias
    LEFT JOIN mediospago  m ON s.idMedios_Pago = m.IdMedios_pago
    WHERE s.activo = 1
      AND (s.nombre LIKE ? OR s.apellido LIKE ?)
    ORDER BY s.apellido ASC, s.nombre ASC
";

$stmt  = $conn->prepare($sql);
$param = '%' . $busqueda . '%';
$stmt->bind_param('ss', $param, $param);
$stmt->execute();
$result = $stmt->get_result();

$mesActual  = (int)date("n");
$anioActual = (int)date("Y");

$res = [];

while ($row = $result->fetch_assoc()) {
    $mesesPagados = [];

    if (!empty($row['meses_pagados'])) {
        foreach (explode(',', $row['meses_pagados']) as $mesId) {
            $mesId = (int)$mesId;
            if (isset($nombresMeses[$mesId])) {
                $mesesPagados[] = $nombresMeses[$mesId];
            }
        }
    }

    // Estado de pago
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
                $mesNombre = $nombresMeses[$m];
                if (!in_array($mesNombre, $mesesEsperados, true)) {
                    $mesesEsperados[] = $mesNombre;
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

    $res[] = $row;
}

echo json_encode($res);
$conn->close();
