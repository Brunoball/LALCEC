<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once(__DIR__ . '/../../config/db.php');

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(["error" => "Conexión fallida: " . $conn->connect_error]));
}

// Verificar si la tabla de pagos_empresas existe
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos_empresas'");
$tienePagos = ($checkPagosTable->num_rows > 0);

// Obtener letra
$letra = isset($_GET["letra"]) ? $conn->real_escape_string($_GET["letra"]) : "";

if (empty($letra)) {
    echo json_encode([]);
    exit();
}

$query = "
    SELECT 
        e.idEmp,
        e.razon_social,
        e.cuit,
        e.domicilio,
        e.domicilio_2,
        e.telefono,
        e.email,
        e.observacion,
        e.fechaunion AS Fechaunion,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago,
        i.descripcion AS descripcion_iva";

if ($tienePagos) {
    $query .= ",
        GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',') as meses_pagados";
}

$query .= "
    FROM empresas e
    LEFT JOIN categorias c ON e.idCategorias = c.idCategorias
    LEFT JOIN mediospago m ON e.idMedios_Pago = m.IdMedios_pago
    LEFT JOIN condicional_iva i ON e.id_iva = i.id_iva";

if ($tienePagos) {
    $query .= "
    LEFT JOIN pagos_empresas p ON e.idEmp = p.idEmp";
}

$query .= "
    WHERE e.razon_social LIKE ?
    GROUP BY e.idEmp
    ORDER BY e.razon_social ASC";

$stmt = $conn->prepare($query);
$param = $letra . '%';
$stmt->bind_param('s', $param);
$stmt->execute();
$result = $stmt->get_result();

$empresas = [];
while ($row = $result->fetch_assoc()) {
    if ($tienePagos && !empty($row['meses_pagados'])) {
        $mesesNumeros = explode(',', $row['meses_pagados']);
        $mesesNombres = array_map(function($mes) {
            $meses = [
                1 => "Enero", 2 => "Febrero", 3 => "Marzo", 4 => "Abril",
                5 => "Mayo", 6 => "Junio", 7 => "Julio", 8 => "Agosto",
                9 => "Septiembre", 10 => "Octubre", 11 => "Noviembre", 12 => "Diciembre"
            ];
            return $meses[(int)$mes] ?? $mes;
        }, $mesesNumeros);
        $row['meses_pagados'] = implode(', ', $mesesNombres);
    } else {
        $row['meses_pagados'] = 'No disponible';
    }
    $empresas[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode($empresas);
