<?php
include_once(__DIR__ . '/../../config/db.php');

function obtener_categoria() {
    global $conn;

    // Si viene un nombre específico
    if (isset($_GET['nombre_categoria']) && !empty($_GET['nombre_categoria'])) {
        $nombre = $conn->real_escape_string($_GET['nombre_categoria']);
        $sql = "SELECT * FROM categorias WHERE Nombre_Categoria = '$nombre'";
        $result = $conn->query($sql);

        if ($result && $result->num_rows > 0) {
            $categoria = $result->fetch_assoc();

            // Obtener histórico de precios si lo querés incluir
            $idCategoria = $categoria['idCategorias'];
            $query_hist = "SELECT h.fecha_cambio, h.precio_anterior, h.precio_nuevo, m.mes as nombre_mes
                           FROM historico_precios_categorias h
                           JOIN meses_pagos m ON h.idMes = m.idMes
                           WHERE h.idCategoria = $idCategoria
                           ORDER BY h.fecha_cambio DESC";
            $result_hist = $conn->query($query_hist);
            $historico = [];

            if ($result_hist) {
                while ($row = $result_hist->fetch_assoc()) {
                    $historico[] = $row;
                }
            }

            $categoria['historico_precios'] = $historico;

            echo json_encode(['data' => $categoria]);
        } else {
            echo json_encode(['error' => 'Categoría no encontrada']);
        }

    } else {
        // Si no se especifica nombre, traer todas
        $sql = "SELECT Nombre_Categoria, Precio_Categoria FROM categorias";
        $result = $conn->query($sql);

        $categorias = [];

        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $categorias[] = $row;
            }
        }

        echo json_encode($categorias);
    }
}

header('Content-Type: application/json');
obtener_categoria();
?>
