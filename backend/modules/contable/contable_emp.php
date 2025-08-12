<?php 

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

// Evitar caché
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Manejo del preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once(__DIR__ . '/../../config/db.php');

// ... tu lógica sigue acá

// Manejar errores de conexión
if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode([
        'success' => false, 
        'message' => "Conexión fallida: " . $conn->connect_error
    ]));
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

try {
    // 1. Obtener precios base y fechas de agregado de categorías
    $sql_categorias = "SELECT idCategorias, Precio_Categoria, fecha_agregado FROM categorias";
    $result_categorias = $conn->query($sql_categorias);
    
    if (!$result_categorias) {
        throw new Exception("Error en consulta de categorías: " . $conn->error);
    }
    
    $precios_base = [];
    $fechas_agregado = [];
    while($row = $result_categorias->fetch_assoc()) {
        $precios_base[$row['idCategorias']] = $row['Precio_Categoria'];
        $fechas_agregado[$row['idCategorias']] = $row['fecha_agregado'];
    }
    
    // 2. Obtener histórico de precios
    $sql_historicos = "SELECT idCategoria, idMes, precio_nuevo, precio_anterior, fecha_cambio 
                       FROM historico_precios_categorias 
                       ORDER BY idCategoria, idMes ASC";
    $result_historicos = $conn->query($sql_historicos);
    
    if (!$result_historicos) {
        throw new Exception("Error en consulta de históricos: " . $conn->error);
    }
    
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
    
    // Función para encontrar mes a partir de fecha
    function encontrarIdMesParaFecha($fecha) {
        if (empty($fecha)) return 1;
        $fechaObj = new DateTime($fecha);
        return (int)$fechaObj->format('n');
    }
    
    // Función para obtener precio correcto
    function obtenerPrecioCorrecto($idCategoria, $mes_pago, $precios_historicos, $precios_base, $precios_iniciales, $fecha_agregado) {
        $idMesInicio = encontrarIdMesParaFecha($fecha_agregado);
        if ($mes_pago < $idMesInicio) return 0;
        
        $precio_actual = $precios_iniciales[$idCategoria] ?? $precios_base[$idCategoria] ?? 0;
        
        if (!isset($precios_historicos[$idCategoria])) return $precio_actual;
        
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
    
    // 3. Obtener pagos de empresas
    $sql_pagos_emp = "SELECT 
                        e.idEmp, 
                        e.razon_social, 
                        c.idCategorias, 
                        c.Nombre_Categoria,
                        c.fecha_agregado,
                        p.fechaPago,
                        p.idMes,
                        p.idPago_Emp,
                        MONTH(p.fechaPago) as mes_pago
                      FROM pagos_empresas p 
                      INNER JOIN empresas e ON p.idEmp = e.idEmp 
                      INNER JOIN categorias c ON e.idCategorias = c.idCategorias 
                      ORDER BY mes_pago, e.razon_social, p.idMes";
    
    $result_pagos = $conn->query($sql_pagos_emp);
    
    if (!$result_pagos) {
        throw new Exception("Error en consulta de pagos: " . $conn->error);
    }
    
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
        
        $pago = [
            'idPago' => $row['idPago_Emp'],
            'Razon_Social' => $row['razon_social'],
            'Nombre_Categoria' => $row['Nombre_Categoria'],
            'Mes_Pagado' => $nombres_meses[$id_mes_pagado],
            'Precio' => $precio,
            'fechaPago' => $row['fechaPago']
        ];
        
        $pagos_por_mes[$mes_pago]['pagos'][] = $pago;
        $pagos_por_mes[$mes_pago]['subtotal'] += $precio;
        $total_general += $precio;
    }
    
    // Convertir a array indexado para el frontend
    $resultado = array_values($pagos_por_mes);
    
    // Enviar respuesta exitosa
    echo json_encode([
        'success' => true,
        'data' => $resultado,
        'total' => $total_general
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    $conn->close();
}
?>