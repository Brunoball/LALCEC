<?php
// Configuración de la base de datos
$host = 'localhost'; // o el host donde esté tu base de datos
$user = 'root';   // tu usuario de MySQL
$pass = 'brunoball516'; // tu contraseña de MySQL
$db = 'agenda'; // tu nombre de base de datos

// Crear la conexión
$conn = new mysqli($host, $user, $pass, $db);

// Verificar la conexión
if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}
?>

