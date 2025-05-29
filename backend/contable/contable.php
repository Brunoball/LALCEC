<?php 
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Agregar headers para evitar caché
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

require_once '../db.php'; 

header('Content-Type: application/json');

if ($conn->connect_error) { 
    die(json_encode(['success' => false, 'message' => "Conexión fallida: " . $conn->connect_error])); 
} 

// Array con los nombres de los meses 
$nombres_meses = [
    1 => 'ENERO', 
    2 => 'FEBRERO', 
    3 => 'MARZO', 
    4 => 'ABRIL', 
    5 => 'MAYO', 
    6 => 'JUNIO', 
    7 => 'JULIO', 
    8 => 'AGOSTO', 
    9 => 'SEPTIEMBRE', 
    10 => 'OCTUBRE', 
    11 => 'NOVIEMBRE', 
    12 => 'DICIEMBRE'
];

// 1. Obtenemos todos los precios base de las categorías con sus fechas de agregado
$sql_categorias = "SELECT idCategorias, Precio_Categoria, fecha_agregado FROM categorias";
$result_categorias = $conn->query($sql_categorias);

$precios_base = [];
$fechas_agregado = [];
while($row = $result_categorias->fetch_assoc()) {
    $precios_base[$row['idCategorias']] = $row['Precio_Categoria'];
    $fechas_agregado[$row['idCategorias']] = $row['fecha_agregado'];
}

// 2. Obtenemos todos los cambios de precios históricos ordenados por categoría y mes
$sql_historicos = "SELECT idCategoria, idMes, precio_nuevo, precio_anterior, fecha_cambio 
                   FROM historico_precios_categorias 
                   ORDER BY idCategoria, idMes ASC";
$result_historicos = $conn->query($sql_historicos);

$precios_historicos = [];
$precios_iniciales = [];
while($row = $result_historicos->fetch_assoc()) {
    $idCategoria = $row['idCategoria'];
    $idMes = $row['idMes'];
    
    $precios_historicos[$idCategoria][$idMes] = $row['precio_nuevo'];
    
    if (!isset($precios_iniciales[$idCategoria])) {
        $precios_iniciales[$idCategoria] = $row['precio_anterior'];
    }
}

function encontrarIdMesParaFecha($fecha) {
    if (empty($fecha)) {
        return 1;
    }
    
    $fechaObj = new DateTime($fecha);
    return (int)$fechaObj->format('n');
}

function obtenerPrecioCorrecto($idCategoria, $mes_pago, $precios_historicos, $precios_base, $precios_iniciales, $fecha_agregado) {
    $idMesInicio = encontrarIdMesParaFecha($fecha_agregado);
    
    if ($mes_pago < $idMesInicio) {
        return 0;
    }
    
    $precio_actual = $precios_iniciales[$idCategoria] ?? $precios_base[$idCategoria] ?? 0;
    
    if (!isset($precios_historicos[$idCategoria])) {
        return $precio_actual;
    }
    
    $meses_cambio = array_keys($precios_historicos[$idCategoria]);
    sort($meses_cambio);
    
    foreach ($meses_cambio as $mes_cambio) {
        if ($mes_cambio <= $mes_pago) {
            $precio_actual = $precios_historicos[$idCategoria][$mes_cambio];
        } else {
            break;
        }
    }
    
    return $precio_actual;
}

// 3. Obtenemos todos los pagos
$sql_pagos = "SELECT 
                s.idSocios, 
                s.Nombre, 
                s.Apellido, 
                c.idCategorias, 
                c.Nombre_Categoria,
                c.fecha_agregado,
                p.fechaPago,
                p.idMes,
                p.idPago,
                MONTH(p.fechaPago) as mes_pago
              FROM pagos p 
              INNER JOIN socios s ON p.idSocios = s.idSocios 
              INNER JOIN categorias c ON s.idCategoria = c.idCategorias 
              ORDER BY mes_pago, s.Apellido, s.Nombre, p.idMes";

$result_pagos = $conn->query($sql_pagos);

$pagos_por_mes = [];
$total_general = 0;

while($row = $result_pagos->fetch_assoc()) {
    $mes_pago = $row['mes_pago'];
    $id_categoria = $row['idCategorias'];
    $id_mes_pagado = $row['idMes'];
    $fecha_agregado = $row['fecha_agregado'];
    
    $precio = obtenerPrecioCorrecto($id_categoria, $mes_pago, $precios_historicos, $precios_base, $precios_iniciales, $fecha_agregado);
    
    if (!isset($pagos_por_mes[$mes_pago])) {
        $pagos_por_mes[$mes_pago] = [
            'nombre' => $nombres_meses[$mes_pago],
            'pagos' => [],
            'subtotal' => 0
        ];
    }
    
    $pagos_por_mes[$mes_pago]['pagos'][] = [
        'idPago' => $row['idPago'],
        'Apellido' => $row['Apellido'],
        'Nombre' => $row['Nombre'],
        'Nombre_Categoria' => $row['Nombre_Categoria'],
        'Mes_Pagado' => $nombres_meses[$id_mes_pagado],
        'Precio' => $precio,
        'fechaPago' => $row['fechaPago']
    ];
    
    $pagos_por_mes[$mes_pago]['subtotal'] += $precio;
    $total_general += $precio;
}

// Convertimos el array asociativo a indexado para el frontend
$resultado = array_values($pagos_por_mes);

echo json_encode($resultado);

$conn->close();
?>