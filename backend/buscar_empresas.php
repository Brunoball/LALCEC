// obtener_empresas.php
<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: http://localhost:3000'); // Permite solicitudes desde el frontend
header('Access-Control-Allow-Methods: GET, POST, OPTIONS'); // Métodos permitidos
header('Access-Control-Allow-Headers: Content-Type'); // Cabeceras permitidas

// Incluir la conexión a la base de datos
require_once 'db.php';

// Consulta SQL para obtener todas las empresas
$sql = "SELECT * FROM empresas";
$result = $conn->query($sql);

$empresas = [];
while ($row = $result->fetch_assoc()) {
    $empresas[] = $row;
}

echo json_encode($empresas);

$conn->close();
?>