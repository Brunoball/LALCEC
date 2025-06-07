<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

include_once(__DIR__ . '/../../config/db.php');

mysqli_set_charset($conn, "utf8");

$medio = $_GET['medio'] ?? '';

if (!$medio) {
    echo json_encode(["error" => "El parámetro 'medio' es requerido."]);
    exit;
}

$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
$tienePagos = ($checkPagosTable->num_rows > 0);

$queryMedio = "SELECT idMedios_Pago FROM mediospago WHERE Medio_Pago = ?";
$stmtMedio = $conn->prepare($queryMedio);

if (!$stmtMedio) {
    echo json_encode(["error" => "Error en la consulta de medios de pago: " . $conn->error]);
    exit;
}

$stmtMedio->bind_param('s', $medio);
$stmtMedio->execute();
$resultMedio = $stmtMedio->get_result();

if ($resultMedio->num_rows === 0) {
    echo json_encode(["error" => "No se encontró el medio de pago especificado."]);
    $stmtMedio->close();
    $conn->close();
    exit;
}

$rowMedio = $resultMedio->fetch_assoc();
$idMediosPago = $rowMedio['idMedios_Pago'];

$stmtMedio->close();

$nombresMeses = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

$querySocios = "
    SELECT 
        s.idSocios AS id,
        s.nombre, 
        s.apellido, 
        s.domicilio,
        s.numero,
        s.domicilio_2,
        s.observacion,
        s.Fechaunion,
        c.nombre_categoria AS categoria, 
        c.precio_categoria AS precio_categoria,
        m.medio_pago";

if ($tienePagos) {
    $querySocios .= ",
        (SELECT GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',') 
         FROM pagos p WHERE p.idSocios = s.idSocios) as meses_pagados";
}

$querySocios .= "
    FROM 
        socios s
    LEFT JOIN 
        categorias c ON s.idcategoria = c.idcategorias
    LEFT JOIN 
        mediospago m ON s.idmedios_pago = m.idmedios_pago
    WHERE 
        s.idmedios_pago = ?
    ORDER BY 
        s.apellido ASC, s.nombre ASC";

$stmtSocios = $conn->prepare($querySocios);

if (!$stmtSocios) {
    echo json_encode(["error" => "Error en la preparación de la consulta: " . $conn->error]);
    exit;
}

$stmtSocios->bind_param('i', $idMediosPago);
$stmtSocios->execute();
$resultSocios = $stmtSocios->get_result();

$mesActual = (int)date("n");
$añoActual = (int)date("Y");

$socios = [];
while ($row = $resultSocios->fetch_assoc()) {
    $estado = 'rojo';
    $mesesPagados = [];

    if ($tienePagos && !empty($row['meses_pagados'])) {
        $idsMes = explode(',', $row['meses_pagados']);
        foreach ($idsMes as $mesId) {
            $mesId = (int)$mesId;
            if (isset($nombresMeses[$mesId])) {
                $mesesPagados[] = $nombresMeses[$mesId];
            }
        }
    }

    if (!empty($row['Fechaunion'])) {
        $fechaUnion = new DateTime($row['Fechaunion']);
        $añoUnion = (int)$fechaUnion->format("Y");
        $mesUnion = (int)$fechaUnion->format("n");

        $mesesEsperados = [];

        for ($a = $añoUnion; $a <= $añoActual; $a++) {
            $desde = ($a === $añoUnion) ? $mesUnion : 1;
            $hasta = ($a === $añoActual) ? $mesActual : 12;

            for ($m = $desde; $m <= $hasta; $m++) {
                $mesNombre = $nombresMeses[$m];
                $mesesEsperados[] = $mesNombre;
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

$stmtSocios->close();
$conn->close();

echo json_encode($socios);