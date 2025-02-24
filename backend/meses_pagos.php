<?php
// Permitir CORS
header("Access-Control-Allow-Origin: http://localhost:3000"); // Permite solicitudes desde localhost:3000 (ajusta si es necesario)
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Continuar con la conexión y lógica
require_once 'db.php'; // Asegúrate de incluir la conexión a la base de datos

// Consulta SQL para obtener los meses de la tabla 'meses_pagos'
$sql = "SELECT mes FROM meses_pagos";

// Ejecutar la consulta
$result = $conn->query($sql);

// Crear un array para almacenar los meses
$meses = array();

if ($result->num_rows > 0) {
    // Recorrer los resultados y almacenarlos en el array
    while ($row = $result->fetch_assoc()) {
        $meses[] = $row;
    }
}

// Cerrar la conexión
$conn->close();

// Convertir el array a formato JSON para enviarlo al frontend
echo json_encode($meses);
?>
