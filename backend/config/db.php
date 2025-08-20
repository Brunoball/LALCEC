<?php
// Configuración de la base de datos
//brunoball516
//Gastex2233
//php -S localhost:3001 -c "C:\PHP\php1\php.ini"

$host = 'localhost';
$user = 'root';
$pass = 'brunoball516';
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
