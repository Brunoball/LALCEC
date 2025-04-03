<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include 'db.php'; // Asegúrate de que este archivo contiene la conexión a la base de datos

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// Obtener parámetros de la URL
$letra = isset($_GET['letra']) ? $_GET['letra'] : '';
$tipo = isset($_GET['tipo']) ? $_GET['tipo'] : 'socios';

// Validar la letra
if (!preg_match('/^[A-Za-z]$/', $letra)) {
    die(json_encode(["error" => "Letra no válida"]));
}

// Verificar si la tabla de pagos existe
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
$tienePagos = ($checkPagosTable->num_rows > 0);

// Determinar el valor de flag según el tipo de entidad
$flag = ($tipo === 'empresa') ? 1 : 0;

// Construir la consulta base
$sql = "
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

// Agregar meses pagados si la tabla existe
if ($tienePagos) {
    $sql .= ",
        (SELECT GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ', ') 
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
        s.flag = ? AND s.apellido LIKE ?
    ORDER BY 
        s.apellido ASC, s.nombre ASC";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    die(json_encode(["error" => "Error en la preparación de la consulta: " . $conn->error]));
}

$likeLetra = $letra . '%';
$stmt->bind_param("is", $flag, $likeLetra);
$stmt->execute();
$result = $stmt->get_result();

$data = array();

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Procesar meses pagados si existen
        $meses_pagados = null;
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
                $meses_pagados = implode(', ', $mesesNombres);
            } else {
                $meses_pagados = '-';
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
            "categoria" => $row['categoria'],
            "precio_categoria" => $row['precio_categoria'],
            "medio_pago" => $row['medio_pago'],
            "meses_pagados" => $meses_pagados
        ];
    }
}

echo json_encode($data);

$stmt->close();
$conn->close();
?>