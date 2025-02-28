<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

include(__DIR__ . '/db.php');

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(["error" => "Conexión fallida: " . $conn->connect_error]));
}

// Verificar si se ha recibido el parámetro 'busqueda'
$busqueda = isset($_GET["busqueda"]) ? $conn->real_escape_string($_GET["busqueda"]) : "";

// Verificar si se ha recibido el parámetro 'tipoEntidad'
$tipoEntidad = isset($_GET["tipoEntidad"]) ? $conn->real_escape_string($_GET["tipoEntidad"]) : "empresas";

// Si la búsqueda está vacía, retornar un array vacío
if (empty($busqueda)) {
    echo json_encode([]);
    exit();
}

// Consulta SQL para buscar en la tabla 'empresas'
$sql = "SELECT * FROM empresas WHERE razon_social LIKE '%$busqueda%' 
        OR cuit LIKE '%$busqueda%' 
        OR domicilio LIKE '%$busqueda%' 
        OR telefono LIKE '%$busqueda%' 
        OR email LIKE '%$busqueda%'";

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
