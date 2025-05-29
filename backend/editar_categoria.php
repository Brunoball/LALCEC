<?php

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

include 'db.php';

// Obtener datos del request
$data = json_decode(file_get_contents('php://input'), true);

// Comprobamos si es una solicitud POST para actualizar la categoría
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nombre_categoria = $data['nombre_categoria'] ?? null;
    $nombre = $data['nombre'] ?? null;
    $precio = $data['precio'] ?? null;

    if ($nombre_categoria && $nombre && $precio) {
        // Escapar los datos para prevenir inyecciones SQL
        $nombre_categoria = $conn->real_escape_string($nombre_categoria);
        $nombre = $conn->real_escape_string($nombre);
        $precio = $conn->real_escape_string($precio);

        // 1. Primero obtenemos el precio actual para guardarlo en el histórico
        $query_get = "SELECT idCategorias, Precio_Categoria FROM categorias WHERE Nombre_Categoria = '$nombre_categoria'";
        $result = $conn->query($query_get);
        
        if ($result->num_rows > 0) {
            $categoria = $result->fetch_assoc();
            $idCategoria = $categoria['idCategorias'];
            $precio_actual = $categoria['Precio_Categoria'];
            
            // Solo guardamos histórico si el precio cambió
            if ($precio != $precio_actual) {
                // Obtenemos el mes actual (idMes)
                $mes_actual = date('n'); // 'n' devuelve el mes sin ceros iniciales (1-12)
                
                // 2. Guardamos el histórico antes de actualizar (ahora con idMes)
                $query_hist = "INSERT INTO historico_precios_categorias 
                              (idCategoria, precio_anterior, precio_nuevo, idMes) 
                              VALUES ($idCategoria, $precio_actual, $precio, $mes_actual)";
                
                if (!$conn->query($query_hist)) {
                    echo json_encode(['error' => '❌ Error al guardar histórico: ' . $conn->error]);
                    exit();
                }
            }
            
            // 3. Actualizamos la categoría
            $query_update = "UPDATE categorias SET 
                            Nombre_Categoria = '$nombre', 
                            Precio_Categoria = '$precio' 
                            WHERE Nombre_Categoria = '$nombre_categoria'";
            
            if ($conn->query($query_update)) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['error' => '❌ Error al actualizar la categoría: ' . $conn->error]);
            }
        } else {
            echo json_encode(['error' => '⚠️ Categoría no encontrada']);
        }
    } else {
        echo json_encode(['error' => '⚠️ Faltan datos para actualizar la categoría']);
    }
    exit();
}

// Si es una solicitud GET, seguimos con la lógica de obtener la categoría
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if (!isset($_GET['nombre_categoria']) || empty($_GET['nombre_categoria'])) {
        echo json_encode(['error' => '⚠️ Falta el parámetro nombre_categoria']);
        exit();
    }

    $nombre_categoria = $_GET['nombre_categoria'];
    $nombre_categoria = $conn->real_escape_string($nombre_categoria);
    
    // Consulta para obtener datos básicos de la categoría
    $query = "SELECT * FROM categorias WHERE Nombre_Categoria = '$nombre_categoria'";
    $result = $conn->query($query);

    if (!$result) {
        echo json_encode(['error' => '❌ Error en la consulta SQL: ' . $conn->error]);
        exit();
    }

    if ($result->num_rows > 0) {
        $categoria = $result->fetch_assoc();
        
        // Consulta para obtener el histórico de precios (ahora incluyendo idMes)
        $query_hist = "SELECT h.fecha_cambio, h.precio_anterior, h.precio_nuevo, m.mes as nombre_mes
                       FROM historico_precios_categorias h
                       JOIN meses_pagos m ON h.idMes = m.idMes
                       WHERE h.idCategoria = {$categoria['idCategorias']}
                       ORDER BY h.fecha_cambio DESC";
        $result_hist = $conn->query($query_hist);
        $historico = [];
        
        if ($result_hist) {
            while ($row = $result_hist->fetch_assoc()) {
                $historico[] = $row;
            }
        }
        
        // Añadimos el histórico a la respuesta
        $categoria['historico_precios'] = $historico;
        
        echo json_encode(['data' => $categoria]);
    } else {
        echo json_encode(['error' => '⚠️ Categoría no encontrada']);
    }
}

$conn->close();
?>