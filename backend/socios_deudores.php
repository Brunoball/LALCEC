<?php
// Permitir CORS
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
        // Obtener todos los socios que han pagado en este mes
        $sqlPagos = "SELECT idSocios FROM pagos WHERE idMes = ?";
        $stmtPagos = $conn->prepare($sqlPagos);
        $stmtPagos->bind_param("i", $idMes);
        $stmtPagos->execute();
        $resultPagos = $stmtPagos->get_result();

        // Crear un array con los IDs de los socios que pagaron
        $sociosPagados = [];
        while ($row = $resultPagos->fetch_assoc()) {
            $sociosPagados[] = $row['idSocios'];
        }

        // Obtener todos los socios deudores con su categoría
        $sqlSocios = "
            SELECT s.idSocios, 
                   COALESCE(s.nombre, '') AS nombre, 
                   COALESCE(s.apellido, '') AS apellido, 
                   COALESCE(s.domicilio, '') AS domicilio, 
                   COALESCE(s.numero, '') AS numero, 
                   COALESCE(c.Nombre_Categoria, '') AS categoria
            FROM socios s
            LEFT JOIN categorias c ON s.idCategoria = c.idCategorias
        ";
        $resultSocios = $conn->query($sqlSocios);

        // Crear un array para almacenar los socios deudores
        $sociosDeudores = [];

        if ($resultSocios->num_rows > 0) {
            while ($row = $resultSocios->fetch_assoc()) {
                // Verificar si el socio no está en la lista de pagados
                if (!in_array($row['idSocios'], $sociosPagados)) {
                    $sociosDeudores[] = $row;
                }
            }
        }

        // Ordenar los socios deudores por apellido alfabéticamente
        usort($sociosDeudores, function ($a, $b) {
            return strcmp($a['apellido'], $b['apellido']);
        });

        // Enviar los resultados de los socios deudores
        echo json_encode($sociosDeudores);
    } else {
        echo json_encode([]);
    }
}

$conn->close();


?>