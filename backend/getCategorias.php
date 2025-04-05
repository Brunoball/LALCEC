<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once "db.php";

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode([
        "status" => "error",
        "message" => "Error de conexión a la base de datos",
        "details" => $conn->connect_error
    ]));
}

try {
    // Función para obtener los meses desde la base de datos
    function obtenerMeses($conn) {
        $sqlMeses = "SELECT idMes, mes FROM meses_pagos ORDER BY idMes";
        $result = $conn->query($sqlMeses);
        
        if (!$result) {
            throw new Exception("Error al obtener meses: " . $conn->error);
        }
        
        $meses = [];
        while ($row = $result->fetch_assoc()) {
            $meses[] = [
                'id' => (int)$row['idMes'],
                'nombre' => $row['mes']
            ];
        }
        return $meses;
    }

    // Función para obtener las categorías con conteo de socios
    function obtenerCategorias($conn) {
        $sql = "SELECT 
                    c.idCategorias AS idCategoria,
                    c.Nombre_Categoria AS Nombre_Categoria,
                    c.Precio_Categoria AS Precio_Categoria,
                    COUNT(s.idSocios) AS cantidad_socios
                FROM 
                    categorias c
                LEFT JOIN 
                    socios s ON c.idCategorias = s.idCategoria
                GROUP BY 
                    c.idCategorias, c.Nombre_Categoria, c.Precio_Categoria";
        
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error al obtener categorías: " . $conn->error);
        }
        
        $categorias = [];
        while ($row = $result->fetch_assoc()) {
            $categorias[] = [
                "nombre" => $row['Nombre_Categoria'],
                "monto" => (float)$row['Precio_Categoria'],
                "socios" => (int)$row['cantidad_socios']
            ];
        }
        return $categorias;
    }

    // Obtener ambos conjuntos de datos
    $mesesData = obtenerMeses($conn);
    $categorias = obtenerCategorias($conn);
    
    // Extraer solo los nombres de los meses en el orden correcto
    $mesesNombres = array_map(function($mes) {
        return $mes['nombre'];
    }, $mesesData);
    
    echo json_encode([
        "status" => "success",
        "data" => [
            "categorias" => $categorias,
            "meses" => $mesesNombres,
            "mesesCompletos" => $mesesData // Opcional: si quieres enviar toda la info
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error en el servidor",
        "details" => $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>