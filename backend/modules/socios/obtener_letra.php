<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../config/db.php');

if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

$letra = isset($_GET['letra']) ? $_GET['letra'] : '';
$tipo = isset($_GET['tipo']) ? $_GET['tipo'] : 'socios';

if (!preg_match('/^[A-Za-z]$/', $letra)) {
    die(json_encode(["error" => "Letra no válida"]));
}

$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
$tienePagos = ($checkPagosTable->num_rows > 0);

$nombresMeses = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

$sql = "
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
    $sql .= ",
        (SELECT GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',') 
         FROM pagos p WHERE p.idSocios = s.idSocios) as meses_pagados";
}

$sql .= "
    FROM 
        socios s
    LEFT JOIN 
        categorias c ON s.idcategoria = c.idcategorias
    LEFT JOIN 
        mediospago m ON s.idmedios_pago = m.idmedios_pago
    WHERE 
        s.apellido LIKE ?
    ORDER BY 
        s.apellido ASC, s.nombre ASC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    die(json_encode(["error" => "Error en la preparación de la consulta: " . $conn->error]));
}

$likeLetra = $letra . '%';
$stmt->bind_param("s", $likeLetra);
$stmt->execute();
$result = $stmt->get_result();

$mesActual = (int)date("n");
$añoActual = (int)date("Y");

$data = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $mesesPagados = [];
        $estado = 'rojo';

        if ($tienePagos && isset($row['meses_pagados']) && !empty($row['meses_pagados'])) {
            $idsMes = explode(',', $row['meses_pagados']);
            foreach ($idsMes as $mesId) {
                $mesId = (int)trim($mesId);
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

        $data[] = [
            "id" => $row['id'],
            "nombre" => $row['nombre'],
            "apellido" => $row['apellido'],
            "domicilio" => $row['domicilio'],
            "domicilio_2" => $row['domicilio_2'],
            "numero" => $row['numero'],
            "observacion" => $row['observacion'],
            "Fechaunion" => $row['Fechaunion'],
            "categoria" => $row['categoria'],
            "precio_categoria" => $row['precio_categoria'],
            "medio_pago" => $row['medio_pago'],
            "meses_pagados" => implode(', ', $mesesPagados),
            "estado_pago" => $estado
        ];
    }
}

echo json_encode($data);

$stmt->close();
$conn->close();