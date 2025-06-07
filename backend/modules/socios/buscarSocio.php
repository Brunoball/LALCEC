<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');


include_once(__DIR__ . '/../../config/db.php');

$busqueda = $_GET['busqueda'] ?? null;

if (!$busqueda) {
    http_response_code(400);
    echo json_encode(["message" => "Falta el parámetro de búsqueda"]);
    exit;
}

$nombresMeses = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

$query = "
    SELECT 
        s.idSocios AS idSocios,
        s.nombre,
        s.apellido,
        s.Fechaunion,
        s.domicilio_2,
        s.observacion,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago,
        (
            SELECT GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',') 
            FROM pagos p 
            WHERE p.idSocios = s.idSocios
        ) AS meses_pagados
    FROM socios s
    LEFT JOIN categorias c ON s.idCategoria = c.idCategorias
    LEFT JOIN mediospago m ON s.idMedios_Pago = m.IdMedios_pago
    WHERE s.nombre LIKE ? OR s.apellido LIKE ?
    ORDER BY s.apellido ASC
";

$stmt = $conn->prepare($query);
$param = '%' . $busqueda . '%';
$stmt->bind_param('ss', $param, $param);
$stmt->execute();
$result = $stmt->get_result();

$mesActual = (int)date("n");
$añoActual = (int)date("Y");

$resultados = [];

while ($row = $result->fetch_assoc()) {
    $estado = 'rojo';
    $mesesPagados = [];

    if (!empty($row['meses_pagados'])) {
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
                if (!in_array($mesNombre, $mesesEsperados)) {
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
    $row['estado_pago'] = $estado;

    $resultados[] = $row;
}

echo json_encode($resultados);
$conn->close();