<?php
require_once(__DIR__ . '/../../config/db.php');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Agregar headers para evitar caché
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Cache en memoria para esta solicitud
$cache = [
    'meses' => null,
    'categorias' => null,
    'historico' => null,
    'preciosIniciales' => null,
    'mesesConNumeros' => null
];

// Función para obtener meses con cache
function obtenerMeses($conn) {
    global $cache;

    if ($cache['meses'] === null) {
        $sql = "SELECT idMes, mes FROM meses_pagos ORDER BY idMes ASC";
        $result = $conn->query($sql);
        $cache['meses'] = $result->fetch_all(MYSQLI_ASSOC);
        
        // Asumimos que idMes representa el orden cronológico (1=enero, 2=febrero, etc.)
        $cache['mesesConNumeros'] = [];
        foreach ($cache['meses'] as $mes) {
            $cache['mesesConNumeros'][$mes['idMes']] = $mes;
        }
    }

    return $cache['meses'];
}

// Función para encontrar el idMes correspondiente a una fecha
function encontrarIdMesParaFecha($fecha, $conn) {
    global $cache;
    
    // Si no tenemos fecha, devolvemos el primer mes (idMes = 1)
    if (empty($fecha)) {
        return 1;
    }
    
    // Extraemos el mes y año de la fecha
    $fechaObj = new DateTime($fecha);
    $mes = (int)$fechaObj->format('n'); // 1-12
    
    // Asumimos que idMes coincide con el número de mes (1=enero, 2=febrero, etc.)
    return $mes;
}

// Función para obtener categorías base con cache
function obtenerCategoriasBase($conn) {
    global $cache;

    if ($cache['categorias'] === null) {
        $sql = "SELECT idCategorias, Nombre_Categoria AS Nombre_Categoria, Precio_Categoria, fecha_agregado 
                FROM categorias";
        $result = $conn->query($sql);
        $cache['categorias'] = $result->fetch_all(MYSQLI_ASSOC);
        
        // Para cada categoría, determinar el idMes a partir del cual debe mostrarse
        foreach ($cache['categorias'] as &$categoria) {
            $fechaAgregado = $categoria['fecha_agregado'];
            $categoria['idMesInicio'] = encontrarIdMesParaFecha($fechaAgregado, $conn);
        }
    }

    return $cache['categorias'];
}

// Función para obtener histórico con cache
function obtenerHistorico($conn) {
    global $cache;

    if ($cache['historico'] === null) {
        $sql = "SELECT idCategoria, idMes, precio_nuevo 
                FROM historico_precios_categorias 
                ORDER BY idMes ASC";
        $result = $conn->query($sql);

        $historial = [];
        while ($row = $result->fetch_assoc()) {
            $historial[$row['idCategoria']][$row['idMes']] = $row['precio_nuevo'];
        }

        $cache['historico'] = $historial;
    }

    return $cache['historico'];
}

// Función para obtener precios iniciales con cache
function obtenerPrecioInicial($conn) {
    global $cache;

    if ($cache['preciosIniciales'] === null) {
        $sql = "SELECT h.idCategoria, h.precio_anterior 
                FROM historico_precios_categorias h
                INNER JOIN (
                    SELECT idCategoria, MIN(idMes) as primerMes 
                    FROM historico_precios_categorias 
                    GROUP BY idCategoria
                ) t ON h.idCategoria = t.idCategoria AND h.idMes = t.primerMes";

        $result = $conn->query($sql);
        $iniciales = [];

        while ($row = $result->fetch_assoc()) {
            $iniciales[$row['idCategoria']] = $row['precio_anterior'];
        }

        $cache['preciosIniciales'] = $iniciales;
    }

    return $cache['preciosIniciales'];
}

function construirTablaPrecios($conn) {
    $meses = obtenerMeses($conn);
    $categorias = obtenerCategoriasBase($conn);
    $historico = obtenerHistorico($conn);
    $preciosIniciales = obtenerPrecioInicial($conn);

    $precios = [];
    $mesFiltro = isset($_GET['mes']) ? $_GET['mes'] : null;

    // Creamos un array por categoría para mantener el precio actualizado
    $preciosActualesPorCategoria = [];

    foreach ($categorias as $categoria) {
        $idCat = $categoria['idCategorias'];
        $precioActual = $preciosIniciales[$idCat] ?? $categoria['Precio_Categoria'];
        $preciosActualesPorCategoria[$idCat] = $precioActual;
    }

    foreach ($meses as $mes) {
        $idMes = $mes['idMes'];
        $nombreMes = $mes['mes'];

        if ($mesFiltro && $nombreMes !== $mesFiltro) {
            continue;
        }

        $precios[$nombreMes] = [];

        foreach ($categorias as $categoria) {
            $idCat = $categoria['idCategorias'];
            $nombre = $categoria['Nombre_Categoria'];
            $idMesInicio = $categoria['idMesInicio'];

            // Solo mostrar la categoría si el mes actual es mayor o igual al mes de inicio
            if ($idMes < $idMesInicio) {
                continue;
            }

            // Verificamos si hay un nuevo precio en este mes
            if (isset($historico[$idCat][$idMes])) {
                $preciosActualesPorCategoria[$idCat] = $historico[$idCat][$idMes];
            }

            $precioActual = $preciosActualesPorCategoria[$idCat];

            $precios[$nombreMes][] = [
                'idMes' => $idMes,
                'mes' => $nombreMes,
                'idCategoria' => $idCat,
                'nombreCategoria' => $nombre,
                'precio' => $precioActual
            ];
        }
    }

    return $precios;
}

// Obtener los datos y construir la tabla de precios agrupada por mes
$preciosFinales = construirTablaPrecios($conn);

// Establecer el tipo de contenido como JSON
header('Content-Type: application/json');

// Convertir los datos a formato JSON y devolverlos
echo json_encode($preciosFinales, JSON_NUMERIC_CHECK);
?>