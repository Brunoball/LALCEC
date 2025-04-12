<?php
require_once "../db.php";

// Establecer cabeceras CORS para permitir solicitudes desde otros orígenes
// Agregar cabeceras CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");


function obtenerMeses($conn) {
    $sql = "SELECT idMes, mes FROM meses_pagos ORDER BY idMes ASC";
    $result = $conn->query($sql);
    
    if ($result === false) {
        die(json_encode(["error" => "Error en la consulta de meses: " . $conn->error]));
    }

    return $result->fetch_all(MYSQLI_ASSOC);
}

function obtenerCategoriasBase($conn) {
    $sql = "SELECT idCategorias, Nombre_Categoria, Precio_Categoria FROM categorias";
    $result = $conn->query($sql);

    if ($result === false) {
        die(json_encode(["error" => "Error en la consulta de categorías: " . $conn->error]));
    }

    return $result->fetch_all(MYSQLI_ASSOC);
}

function obtenerHistorico($conn) {
    $sql = "SELECT idCategoria, idMes, precio_nuevo FROM historico_precios_categorias ORDER BY idMes ASC";
    $result = $conn->query($sql);
    
    if ($result === false) {
        die(json_encode(["error" => "Error en la consulta del historial de precios: " . $conn->error]));
    }

    $historial = [];
    while ($row = $result->fetch_assoc()) {
        $historial[$row['idCategoria']][$row['idMes']] = $row['precio_nuevo'];
    }

    return $historial;
}

function obtenerPrecioInicial($conn) {
    $sql = "SELECT idCategoria, MIN(idMes) as primerMes FROM historico_precios_categorias GROUP BY idCategoria";
    $result = $conn->query($sql);
    
    if ($result === false) {
        die(json_encode(["error" => "Error en la consulta de precios iniciales: " . $conn->error]));
    }

    $iniciales = [];
    while ($row = $result->fetch_assoc()) {
        $idCat = $row['idCategoria'];
        $primerMes = $row['primerMes'];

        $sql2 = "SELECT precio_anterior FROM historico_precios_categorias WHERE idCategoria = $idCat AND idMes = $primerMes LIMIT 1";
        $res2 = $conn->query($sql2);
        
        if ($res2 === false) {
            die(json_encode(["error" => "Error al obtener el precio anterior: " . $conn->error]));
        }

        $precioAnterior = $res2->fetch_assoc()['precio_anterior'] ?? null;

        if ($precioAnterior !== null) {
            $iniciales[$idCat] = $precioAnterior;
        }
    }

    return $iniciales;
}

function construirTablaPrecios($conn) {
    $meses = obtenerMeses($conn);
    $categorias = obtenerCategoriasBase($conn);
    $historico = obtenerHistorico($conn);
    $preciosIniciales = obtenerPrecioInicial($conn);

    $precios = [];

    foreach ($categorias as $categoria) {
        $idCat = $categoria['idCategorias'];
        $nombre = $categoria['Nombre_Categoria'];

        // Usar precio del historial si existe, si no, tomar precio base
        $precioActual = $preciosIniciales[$idCat] ?? $categoria['Precio_Categoria'];

        foreach ($meses as $mes) {
            $idMes = $mes['idMes'];
            $nombreMes = $mes['mes'];

            // Verificar si hay cambio en este mes
            if (isset($historico[$idCat][$idMes])) {
                $precioActual = $historico[$idCat][$idMes];
            }

            $precios[] = [
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

// Obtener los datos y construir la tabla de precios
$preciosFinales = construirTablaPrecios($conn);

// Establecer el tipo de contenido como JSON
header('Content-Type: application/json');

// Convertir los datos a formato JSON y devolverlos
echo json_encode($preciosFinales);
?>
