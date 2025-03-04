// obtener_empresas.php
<?php
header("Content-Type: application/json");

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