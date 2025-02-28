<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

include(__DIR__ . '/db.php');

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(["error" => "Conexión fallida: " . $conn->connect_error]));
}

// Obtener la letra y sanitizar
$letra = isset($_GET["letra"]) ? $conn->real_escape_string($_GET["letra"]) : "";

// Validar que la letra no esté vacía
if (empty($letra)) {
    echo json_encode([]);
    exit();
}

// Consulta SQL para obtener empresas cuyo nombre comience con la letra dada
$sql = "SELECT * FROM empresas WHERE razon_social LIKE '$letra%'";

$result = $conn->query($sql);

$empresas = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $empresas[] = $row;
    }
}

// Cerrar conexión
$conn->close();

// Devolver los resultados en formato JSON
echo json_encode($empresas);
