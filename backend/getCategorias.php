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

    // Función para obtener el precio correcto según el mes seleccionado
    function obtenerPrecioPorMes($conn, $idCategoria, $mesSeleccionado) {
        // 1. Obtener precio base actual
        $sqlPrecioBase = "SELECT Precio_Categoria FROM categorias WHERE idCategorias = ?";
        $stmtBase = $conn->prepare($sqlPrecioBase);
        $stmtBase->bind_param("i", $idCategoria);
        $stmtBase->execute();
        $resultBase = $stmtBase->get_result();
        $precioActual = ($resultBase->num_rows > 0) ? $resultBase->fetch_assoc()['Precio_Categoria'] : 0;
    
        if ($mesSeleccionado === null || $mesSeleccionado === 'Todos') {
            return $precioActual;
        }
    
        // 2. Obtener ID del mes seleccionado
        $sqlMesId = "SELECT idMes FROM meses_pagos WHERE mes = ?";
        $stmtMes = $conn->prepare($sqlMesId);
        $stmtMes->bind_param("s", $mesSeleccionado);
        $stmtMes->execute();
        $resultMes = $stmtMes->get_result();
        
        if ($resultMes->num_rows === 0) {
            return $precioActual;
        }
        
        $idMesSeleccionado = $resultMes->fetch_assoc()['idMes'];
    
        // 3. Buscar el PRIMER cambio posterior al mes seleccionado
        $sqlHistorico = "SELECT precio_anterior 
                        FROM historico_precios_categorias 
                        WHERE idCategoria = ? AND idMes > ? 
                        ORDER BY idMes ASC
                        LIMIT 1";
        
        $stmtHist = $conn->prepare($sqlHistorico);
        $stmtHist->bind_param("ii", $idCategoria, $idMesSeleccionado);
        $stmtHist->execute();
        $resultHist = $stmtHist->get_result();
    
        // Si hay un cambio posterior, significa que el precio era el anterior
        if ($resultHist->num_rows > 0) {
            return $resultHist->fetch_assoc()['precio_anterior'];
        }
    
        // 4. Si no hay cambios posteriores, usar el precio actual
        return $precioActual;
    }



    // Función para obtener las categorías con precios según mes
    function obtenerCategorias($conn, $mesSeleccionado = null) {
        // Obtenemos categorías con conteo de socios
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
            $precio = obtenerPrecioPorMes($conn, $row['idCategoria'], $mesSeleccionado);
            
            $categorias[] = [
                "nombre" => $row['Nombre_Categoria'],
                "monto" => (float)$precio,
                "socios" => (int)$row['cantidad_socios']
            ];
        }
        
        return $categorias;
    }

    // Obtener parámetro del mes si existe
    $mesSeleccionado = isset($_GET['mes']) ? $_GET['mes'] : null;
    
    // Obtener ambos conjuntos de datos
    $mesesData = obtenerMeses($conn);
    $categorias = obtenerCategorias($conn, $mesSeleccionado);
    
    // Extraer solo los nombres de los meses en el orden correcto
    $mesesNombres = array_map(function($mes) {
        return $mes['nombre'];
    }, $mesesData);
    
    echo json_encode([
        "status" => "success",
        "data" => [
            "categorias" => $categorias,
            "meses" => $mesesNombres,
            "mesesCompletos" => $mesesData
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