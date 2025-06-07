<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
include_once(__DIR__ . '/../../config/db.php');

// Modificar la consulta para obtener ambos campos
$sql = "SELECT idMes, mes FROM meses_pagos ORDER BY idMes";

$result = $conn->query($sql);
$meses = array();

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $meses[] = $row;
    }
}

$conn->close();
echo json_encode($meses);
?>