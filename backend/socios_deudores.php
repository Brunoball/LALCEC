<?php
// Permitir CORS
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Incluir la conexión a la base de datos
require_once 'db.php';

// Función para obtener el precio correcto según el mes seleccionado
function obtenerPrecioPorMes($conn, $idCategoria, $mesSeleccionado) {
    // Obtener precio actual
    $sqlPrecioBase = "SELECT Precio_Categoria FROM categorias WHERE idCategorias = ?";
    $stmtBase = $conn->prepare($sqlPrecioBase);
    $stmtBase->bind_param("i", $idCategoria);
    $stmtBase->execute();
    $resultBase = $stmtBase->get_result();
    $precioActual = ($resultBase->num_rows > 0) ? $resultBase->fetch_assoc()['Precio_Categoria'] : 0;

    if ($mesSeleccionado === null || $mesSeleccionado === 'Todos') {
        return $precioActual;
    }

    // Obtener idMes del mes seleccionado
    $sqlMesId = "SELECT idMes FROM meses_pagos WHERE mes = ?";
    $stmtMes = $conn->prepare($sqlMesId);
    $stmtMes->bind_param("s", $mesSeleccionado);
    $stmtMes->execute();
    $resultMes = $stmtMes->get_result();

    if ($resultMes->num_rows === 0) {
        return $precioActual;
    }

    $idMesSeleccionado = $resultMes->fetch_assoc()['idMes'];

    // Buscar el primer cambio posterior a ese mes
    $sqlHistorico = "SELECT precio_anterior 
                     FROM historico_precios_categorias 
                     WHERE idCategoria = ? AND idMes > ? 
                     ORDER BY idMes ASC
                     LIMIT 1";

    $stmtHist = $conn->prepare($sqlHistorico);
    $stmtHist->bind_param("ii", $idCategoria, $idMesSeleccionado);
    $stmtHist->execute();
    $resultHist = $stmtHist->get_result();

    if ($resultHist->num_rows > 0) {
        return $resultHist->fetch_assoc()['precio_anterior'];
    }

    return $precioActual;
}

// Obtener el mes desde los parámetros GET
$mes = isset($_GET['mes']) ? $_GET['mes'] : '';

if ($mes) {
    // Obtener el idMes del mes seleccionado
    $sqlMes = "SELECT idMes FROM meses_pagos WHERE mes = ?";
    $stmt = $conn->prepare($sqlMes);
    $stmt->bind_param("s", $mes);
    $stmt->execute();
    $resultMes = $stmt->get_result();
    $mesData = $resultMes->fetch_assoc();
    $idMes = $mesData['idMes'] ?? null;

    if ($idMes) {
        // Obtener todos los socios que han pagado en este mes
        $sqlPagos = "SELECT idSocios FROM pagos WHERE idMes = ?";
        $stmtPagos = $conn->prepare($sqlPagos);
        $stmtPagos->bind_param("i", $idMes);
        $stmtPagos->execute();
        $resultPagos = $stmtPagos->get_result();

        $sociosPagados = [];
        while ($row = $resultPagos->fetch_assoc()) {
            $sociosPagados[] = $row['idSocios'];
        }

        // Obtener todos los socios con su categoría (sin el precio actual aquí)
        $sqlSocios = "
            SELECT s.idSocios, 
                   COALESCE(s.nombre, '') AS nombre, 
                   COALESCE(s.apellido, '') AS apellido, 
                   COALESCE(s.domicilio, '') AS domicilio, 
                   COALESCE(s.numero, '') AS numero, 
                   COALESCE(s.idCategoria, 0) AS idCategoria,
                   COALESCE(c.Nombre_Categoria, '') AS categoria
            FROM socios s
            LEFT JOIN categorias c ON s.idCategoria = c.idCategorias
        ";
        $resultSocios = $conn->query($sqlSocios);

        $sociosDeudores = [];

        if ($resultSocios->num_rows > 0) {
            while ($row = $resultSocios->fetch_assoc()) {
                if (!in_array($row['idSocios'], $sociosPagados)) {
                    $idCategoria = $row['idCategoria'] ?? null;
                    $row['precio_categoria'] = obtenerPrecioPorMes($conn, $idCategoria, $mes);
                    $sociosDeudores[] = $row;
                }
            }
        }

        // Ordenar por apellido
        usort($sociosDeudores, function ($a, $b) {
            return strcmp($a['apellido'], $b['apellido']);
        });

        echo json_encode($sociosDeudores);
    } else {
        echo json_encode([]);
    }
}

$conn->close();
?>
