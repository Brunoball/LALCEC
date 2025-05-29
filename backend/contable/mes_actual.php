<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

require_once '../db.php';

// Obtener el último mes cerrado
$sql = "SELECT mes, anio FROM cierres_mensuales WHERE estado = 'cerrado' 
        ORDER BY anio DESC, FIELD(mes, 'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE') DESC 
        LIMIT 1";
$result = $conn->query($sql);

$mes_actual = 'ENERO';
$anio_actual = date('Y');

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    $index = array_search($row['mes'], $meses);
    $mes_actual = $index < 11 ? $meses[$index + 1] : 'ENERO';
    $anio_actual = $index < 11 ? $row['anio'] : $row['anio'] + 1;
}

echo json_encode(['mes' => $mes_actual, 'anio' => $anio_actual]);
?>