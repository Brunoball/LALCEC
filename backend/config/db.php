<?php
// Configuración de la base de datos
//brunoball516
//Gastex2233
$host = 'localhost';
$user = 'root';
$pass = 'Gastex2233';
$db = 'agenda';

// Crear la conexión
$conn = new mysqli($host, $user, $pass, $db);

// Verificar la conexión
if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}

// Establecer el conjunto de caracteres a UTF-8 (opcional pero recomendado)
$conn->set_charset("utf8");
?>
