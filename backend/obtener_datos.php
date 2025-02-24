<?php
header("Access-Control-Allow-Origin: *"); // Permitir todas las solicitudes de cualquier origen
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Headers permitidos

include(__DIR__ . '/db.php'); // Asegúrate de que tu conexión a la base de datos esté correctamente configurada

header('Content-Type: application/json');

// Obtener todas las categorías disponibles
$categoriasQuery = "SELECT idCategorias, Nombre_categoria FROM categorias";
$categoriasResult = $conn->query($categoriasQuery);
$categorias = [];
while ($row = $categoriasResult->fetch_assoc()) {
    $categorias[] = $row;
}

// Obtener todos los medios de pago disponibles
$mediosPagoQuery = "SELECT IdMedios_pago, Medio_Pago FROM mediospago";
$mediosPagoResult = $conn->query($mediosPagoQuery);
$mediosPago = [];
while ($row = $mediosPagoResult->fetch_assoc()) {
    $mediosPago[] = $row;
}

// Devolver ambas listas en un solo objeto JSON
echo json_encode([
    "categorias" => $categorias,
    "mediosPago" => $mediosPago
]);

$conn->close();
?>
