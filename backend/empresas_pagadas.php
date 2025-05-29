<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Incluir la conexión a la base de datos
require_once 'db.php';

// Función para obtener el precio correcto según el mes seleccionado (igual que en el primer código)
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
                            COALESCE(c.Nombre_Categoria, '') AS categoria,
                            e.idCategorias
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
                // Obtener el precio correcto según el mes seleccionado
                $idCategoria = $row['idCategorias'] ?? null;
                $row['precio_categoria'] = obtenerPrecioPorMes($conn, $idCategoria, $mesSeleccionado);
                
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