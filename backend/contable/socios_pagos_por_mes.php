<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../db.php'; // Conexión $conn

$response = array();

try {
    // Verificar conexión
    if (!isset($conn) || $conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }

    // Obtener todos los meses con pagos (desde meses_pagos)
    $query = "SELECT DISTINCT p.idMes, mp.mes 
              FROM pagos p
              JOIN meses_pagos mp ON p.idMes = mp.idMes
              ORDER BY p.idMes";

    $result = $conn->query($query);
    if (!$result) {
        throw new Exception("Error en la consulta: " . $conn->error);
    }

    $sociosPorMes = array();
    $sociosPorCategoriaPorMes = array();

    while ($row = $result->fetch_assoc()) {
        $idMes = $row['idMes'];
        $nombreMes = $row['mes'];

        // Total socios que pagaron en este mes
        $queryTotal = "SELECT COUNT(DISTINCT p.idSocios) as totalSocios
                      FROM pagos p
                      WHERE p.idMes = ?";

        $stmtTotal = $conn->prepare($queryTotal);
        $stmtTotal->bind_param("i", $idMes);
        $stmtTotal->execute();
        $resultTotal = $stmtTotal->get_result();
        $totalRow = $resultTotal->fetch_assoc();
        $stmtTotal->close();

        $sociosPorMes[] = array(
            'idMes' => (int)$idMes,
            'nombreMes' => $nombreMes,
            'total' => (int)$totalRow['totalSocios']
        );

        // Socios por categoría para este mes
        $queryCategorias = "SELECT 
                              c.idCategorias, 
                              c.Nombre_Categoria, 
                              COUNT(DISTINCT p.idSocios) as cantidad
                           FROM pagos p
                           JOIN socios s ON p.idSocios = s.idSocios
                           JOIN categorias c ON s.idCategoria = c.idCategorias
                           WHERE p.idMes = ?
                           GROUP BY c.idCategorias, c.Nombre_Categoria
                           ORDER BY c.Nombre_Categoria";

        $stmtCategorias = $conn->prepare($queryCategorias);
        $stmtCategorias->bind_param("i", $idMes);
        $stmtCategorias->execute();
        $resultCategorias = $stmtCategorias->get_result();
        $stmtCategorias->close();

        $categorias = array();
        while ($catRow = $resultCategorias->fetch_assoc()) {
            $categorias[$catRow['Nombre_Categoria']] = (int)$catRow['cantidad'];
        }

        $sociosPorCategoriaPorMes[$idMes] = array(
            'idMes' => (int)$idMes,
            'nombreMes' => $nombreMes,
            'categorias' => $categorias
        );
    }

    $response = array(
        'success' => true,
        'data' => array(
            'totalSocios' => array_sum(array_column($sociosPorMes, 'total')),
            'sociosPorMes' => $sociosPorMes,
            'sociosPorCategoriaPorMes' => $sociosPorCategoriaPorMes
        )
    );

} catch (Exception $e) {
    $response = array(
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    );
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>