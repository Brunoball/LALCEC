<?php
// backend/modules/contable/contable_emp.php  (acción = contable_emp)
// Devuelve contabilidad de EMPRESAS agrupada por MES del AÑO indicado

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once(__DIR__ . '/../../config/db.php');

// Array con los nombres de los meses
$nombres_meses = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

try {
    if ($conn->connect_error) {
        throw new Exception("Conexión fallida: " . $conn->connect_error);
    }

    // ===== NUEVO: parámetro año
    $anio = isset($_GET['anio']) ? (int)$_GET['anio'] : (int)date('Y');
    if ($anio < 1900 || $anio > 3000) {
        $anio = (int)date('Y');
    }

    // 1. Precios base y fecha agregado de categorías
    $sql_categorias = "SELECT idCategorias, Precio_Categoria, fecha_agregado FROM categorias";
    $result_categorias = $conn->query($sql_categorias);
    if (!$result_categorias) {
        throw new Exception("Error en consulta de categorías: " . $conn->error);
    }

    $precios_base = [];
    $fechas_agregado = [];
    while($row = $result_categorias->fetch_assoc()) {
        $precios_base[(int)$row['idCategorias']] = (float)$row['Precio_Categoria'];
        $fechas_agregado[(int)$row['idCategorias']] = $row['fecha_agregado'];
    }

    // 2. Histórico de precios
    $sql_historicos = "SELECT idCategoria, idMes, precio_nuevo, precio_anterior, fecha_cambio 
                       FROM historico_precios_categorias 
                       ORDER BY idCategoria, idMes ASC";
    $result_historicos = $conn->query($sql_historicos);
    if (!$result_historicos) {
        // si no existe, seguimos con base
        $precios_historicos = [];
        $precios_iniciales  = [];
    } else {
        $precios_historicos = [];
        $precios_iniciales  = [];
        while($row = $result_historicos->fetch_assoc()) {
            $idCategoria = (int)$row['idCategoria'];
            $idMes       = (int)$row['idMes'];
            $precios_historicos[$idCategoria][$idMes] = (float)$row['precio_nuevo'];
            if (!isset($precios_iniciales[$idCategoria])) {
                $precios_iniciales[$idCategoria] = (float)$row['precio_anterior'];
            }
        }
    }

    // Helpers de precio
    function encontrarIdMesParaFecha($fecha) {
        if (empty($fecha)) return 1;
        $fechaObj = new DateTime($fecha);
        return (int)$fechaObj->format('n');
    }

    function obtenerPrecioCorrecto($idCategoria, $mes_pago, $precios_historicos, $precios_base, $precios_iniciales, $fecha_agregado) {
        $idMesInicio = encontrarIdMesParaFecha($fecha_agregado);
        if ($mes_pago < $idMesInicio) return 0.0;

        $precio_actual = $precios_iniciales[$idCategoria] ?? $precios_base[$idCategoria] ?? 0.0;
        if (!isset($precios_historicos[$idCategoria])) return (float)$precio_actual;

        $meses_cambio = array_keys($precios_historicos[$idCategoria]);
        sort($meses_cambio);
        foreach ($meses_cambio as $mes_cambio) {
            if ($mes_cambio <= $mes_pago) {
                $precio_actual = $precios_historicos[$idCategoria][$mes_cambio];
            } else {
                break;
            }
        }
        return (float)$precio_actual;
    }

    // 3. Pagos de empresas con filtro de AÑO
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
                      WHERE YEAR(p.fechaPago) = ?
                      ORDER BY mes_pago, e.razon_social, p.idMes";

    $stmt = $conn->prepare($sql_pagos_emp);
    if (!$stmt) {
        throw new Exception("Error al preparar consulta de pagos: " . $conn->error);
    }
    $stmt->bind_param("i", $anio);
    $stmt->execute();
    $result_pagos = $stmt->get_result();
    if (!$result_pagos) {
        throw new Exception("Error en consulta de pagos: " . $conn->error);
    }

    $pagos_por_mes = [];
    $total_general = 0.0;

    while($row = $result_pagos->fetch_assoc()) {
        $mes_pago      = (int)$row['mes_pago'];
        $id_categoria  = (int)$row['idCategorias'];
        $id_mes_pagado = (int)$row['idMes'];
        $fecha_agregado = $row['fecha_agregado'];

        $precio = obtenerPrecioCorrecto(
            $id_categoria, $mes_pago, $precios_historicos, $precios_base, $precios_iniciales, $fecha_agregado
        );

        if (!isset($pagos_por_mes[$mes_pago])) {
            $pagos_por_mes[$mes_pago] = [
                'nombre'   => $nombres_meses[$mes_pago] ?? '',
                'pagos'    => [],
                'subtotal' => 0.0
            ];
        }

        $pago = [
            'idPago'           => (int)$row['idPago_Emp'],
            'Razon_Social'     => $row['razon_social'],
            'Nombre_Categoria' => $row['Nombre_Categoria'],
            'Mes_Pagado'       => $nombres_meses[$id_mes_pagado] ?? '',
            'Precio'           => $precio,
            'fechaPago'        => $row['fechaPago']
        ];

        $pagos_por_mes[$mes_pago]['pagos'][] = $pago;
        $pagos_por_mes[$mes_pago]['subtotal'] += $precio;
        $total_general += $precio;
    }

    $resultado = array_values($pagos_por_mes);

    echo json_encode([
        'success' => true,
        'data'    => $resultado,
        'total'   => $total_general
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if ($conn && $conn instanceof mysqli) { $conn->close(); }
}
