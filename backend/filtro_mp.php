<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

include(__DIR__ . '/db.php');

// Configurar la codificación UTF-8
mysqli_set_charset($conn, "utf8");

// Obtener el medio de pago desde la URL
$medio = $_GET['medio'] ?? '';

if (!$medio) {
    echo json_encode(["error" => "El parámetro 'medio' es requerido."]);
    exit;
}

// Verificar si la tabla de pagos existe
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
$tienePagos = ($checkPagosTable->num_rows > 0);

// Obtener el idMedios_Pago correspondiente al nombre del medio de pago
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

// Construir la consulta principal
$querySocios = "
    SELECT 
        s.idSocios AS id,
        s.nombre, 
        s.apellido, 
        s.domicilio,
        s.numero,
        s.domicilio_2,
        s.observacion,
        c.nombre_categoria AS categoria, 
        c.precio_categoria AS precio_categoria,
        m.medio_pago";

if ($tienePagos) {
    $querySocios .= ",
        (SELECT GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ', ') 
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

$socios = [];
while ($row = $resultSocios->fetch_assoc()) {
    if ($tienePagos && isset($row['meses_pagados'])) {
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
        $row['meses_pagados'] = null;
    }
    $socios[] = $row;
}

$stmtSocios->close();
$conn->close();

echo json_encode($socios);
?>
