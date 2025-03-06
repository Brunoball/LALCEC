<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Incluir la conexión a la base de datos
require_once 'db.php';

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
        // Obtener todas las empresas que han pagado en este mes
        $sqlPagos = "SELECT idEmp FROM pagos_empresas WHERE idMes = ?";
        $stmtPagos = $conn->prepare($sqlPagos);
        $stmtPagos->bind_param("i", $idMes);
        $stmtPagos->execute();
        $resultPagos = $stmtPagos->get_result();

        // Crear un array con los IDs de las empresas que pagaron
        $empresasPagadas = [];
        while ($row = $resultPagos->fetch_assoc()) {
            $empresasPagadas[] = $row['idEmp'];
        }

        // Obtener todas las empresas deudoras con su categoría
        $sqlEmpresas = "
            SELECT e.idEmp, 
                   COALESCE(e.razon_social, '') AS razon_social, 
                   COALESCE(e.domicilio, '') AS domicilio, 
                   COALESCE(c.Nombre_Categoria, '') AS categoria
            FROM empresas e
            LEFT JOIN categorias c ON e.idCategorias = c.idCategorias
        ";
        $resultEmpresas = $conn->query($sqlEmpresas);

        // Crear un array para almacenar las empresas deudoras
        $empresasDeudoras = [];

        if ($resultEmpresas->num_rows > 0) {
            while ($row = $resultEmpresas->fetch_assoc()) {
                // Verificar si la empresa no está en la lista de pagadas
                if (!in_array($row['idEmp'], $empresasPagadas)) {
                    $empresasDeudoras[] = $row;
                }
            }
        }

        // Ordenar las empresas deudoras por razón social alfabéticamente
        usort($empresasDeudoras, function ($a, $b) {
            return strcmp($a['razon_social'], $b['razon_social']);
        });

        // Enviar los resultados de las empresas deudoras
        echo json_encode($empresasDeudoras);
    } else {
        echo json_encode([]);
    }
}

$conn->close();
?>