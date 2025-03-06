<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Incluir la conexión a la base de datos
require_once 'db.php';

// Obtener el mes seleccionado desde la solicitud
$mesSeleccionado = isset($_GET['mes']) ? $_GET['mes'] : '';

if ($mesSeleccionado) {
    // Obtener el idMes de la tabla meses_pagos
    $sqlMes = "SELECT idMes FROM meses_pagos WHERE mes = ? LIMIT 1";
    $stmt = $conn->prepare($sqlMes);
    $stmt->bind_param("s", $mesSeleccionado);
    $stmt->execute();
    $resultMes = $stmt->get_result();
    $mesData = $resultMes->fetch_assoc();
    $idMes = $mesData['idMes'] ?? null;

    if ($idMes) {
        // Consulta SQL para obtener las empresas que pagaron en ese mes (sin duplicados)
        $sqlPagos = "
            SELECT DISTINCT e.idEmp, 
                            COALESCE(e.razon_social, '') AS razon_social, 
                            COALESCE(e.domicilio, '') AS domicilio, 
                            COALESCE(c.Nombre_Categoria, '') AS categoria
            FROM pagos_empresas p
            JOIN empresas e ON p.idEmp = e.idEmp
            LEFT JOIN categorias c ON e.idCategorias = c.idCategorias
            WHERE p.idMes = ?
            GROUP BY e.idEmp
            ORDER BY e.razon_social ASC"; // Ordena alfabéticamente por razón social

        $stmtPagos = $conn->prepare($sqlPagos);
        $stmtPagos->bind_param("i", $idMes);
        $stmtPagos->execute();
        $resultPagos = $stmtPagos->get_result();
        $empresasPagadas = array();

        if ($resultPagos->num_rows > 0) {
            while ($row = $resultPagos->fetch_assoc()) {
                $empresasPagadas[] = $row;
            }
        }

        echo json_encode($empresasPagadas);
    } else {
        echo json_encode([]);
    }
} else {
    echo json_encode([]);
}

$conn->close();
?>