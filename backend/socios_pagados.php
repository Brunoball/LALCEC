<?php
// Permitir CORS
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Conexión a la base de datos
require_once 'db.php';

// Obtener el mes seleccionado desde la solicitud
$mesSeleccionado = isset($_GET['mes']) ? $_GET['mes'] : '';

if ($mesSeleccionado) {
    // Obtener el idMes de la tabla meses_pagos
    $sqlMes = "SELECT idMes FROM meses_pagos WHERE mes = '$mesSeleccionado' LIMIT 1";
    $resultMes = $conn->query($sqlMes);

    if ($resultMes->num_rows > 0) {
        $rowMes = $resultMes->fetch_assoc();
        $idMes = $rowMes['idMes'];

        // Consulta SQL para obtener los socios que pagaron en ese mes (sin duplicados)
        $sqlPagos = "
            SELECT DISTINCT socios.idSocios, 
                            socios.nombre, 
                            socios.apellido, 
                            socios.domicilio, 
                            socios.numero, 
                            categorias.Nombre_Categoria AS categoria
            FROM pagos
            JOIN socios ON pagos.idSocios = socios.idSocios
            LEFT JOIN categorias ON socios.idCategoria = categorias.idCategorias
            WHERE pagos.idMes = $idMes
            GROUP BY socios.idSocios
            ORDER BY socios.apellido ASC"; // Ordena alfabéticamente por apellido

        $resultPagos = $conn->query($sqlPagos);
        $sociosPagados = array();

        if ($resultPagos->num_rows > 0) {
            while ($row = $resultPagos->fetch_assoc()) {
                $row['nombre'] = $row['nombre'] ?? '';
                $row['apellido'] = $row['apellido'] ?? '';
                $row['domicilio'] = $row['domicilio'] ?? '';
                $row['numero'] = $row['numero'] ?? '';
                $row['categoria'] = $row['categoria'] ?? '';
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
