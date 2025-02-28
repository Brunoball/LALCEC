<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

include(__DIR__ . '/db.php');

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(["error" => "Conexión fallida: " . $conn->connect_error]));
}

// Verificar si se ha recibido el parámetro 'tipo'
$tipo = isset($_GET["tipo"]) ? $conn->real_escape_string($_GET["tipo"]) : "empresas";

// Consulta SQL para obtener todas las empresas
$sql = "SELECT * FROM empresas";
$result = $conn->query($sql);

$empresas = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $empresas[] = $row;
    }
}

// Cerrar conexión
$conn->close();

// Devolver los datos en formato JSON
echo json_encode(["empresas" => $empresas]);
