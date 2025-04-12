<?php
// Permitir CORS
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Conexión a la base de datos
require_once 'db.php';

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

// Obtener el mes seleccionado desde la solicitud
$mesSeleccionado = isset($_GET['mes']) ? $_GET['mes'] : '';

if ($mesSeleccionado) {
    // Obtener el idMes de la tabla meses_pagos
    $sqlMes = "SELECT idMes FROM meses_pagos WHERE mes = '$mesSeleccionado' LIMIT 1";
    $resultMes = $conn->query($sqlMes);

    if ($resultMes->num_rows > 0) {
        $rowMes = $resultMes->fetch_assoc();
        $idMes = $rowMes['idMes'];

        // Consulta SQL para obtener los socios que pagaron en ese mes (agregado idCategoria)
        $sqlPagos = "
            SELECT DISTINCT socios.idSocios, 
                            socios.nombre, 
                            socios.apellido, 
                            socios.domicilio, 
                            socios.numero, 
                            socios.idCategoria,
                            categorias.Nombre_Categoria AS categoria
            FROM pagos
            JOIN socios ON pagos.idSocios = socios.idSocios
            LEFT JOIN categorias ON socios.idCategoria = categorias.idCategorias
            WHERE pagos.idMes = $idMes
            GROUP BY socios.idSocios
            ORDER BY socios.apellido ASC";

        $resultPagos = $conn->query($sqlPagos);
        $sociosPagados = array();

        if ($resultPagos->num_rows > 0) {
            while ($row = $resultPagos->fetch_assoc()) {
                $row['nombre'] = $row['nombre'] ?? '';
                $row['apellido'] = $row['apellido'] ?? '';
                $row['domicilio'] = $row['domicilio'] ?? '';
                $row['numero'] = $row['numero'] ?? '';
                $row['categoria'] = $row['categoria'] ?? '';

                // Obtener el precio correcto según el mes seleccionado
                $idCategoria = $row['idCategoria'] ?? null;
                $row['precio_categoria'] = obtenerPrecioPorMes($conn, $idCategoria, $mesSeleccionado);

                $sociosPagados[] = $row;
            }
        }

        echo json_encode($sociosPagados);
    } else {
        echo json_encode([]);
    }
} else {
    echo json_encode([]);
}

$conn->close();
?>
