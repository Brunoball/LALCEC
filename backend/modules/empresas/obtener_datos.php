<?php
header("Access-Control-Allow-Origin: *"); // Permitir todas las solicitudes de cualquier origen
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Headers permitidos

require_once(__DIR__ . '/../../config/db.php');

header('Content-Type: application/json');

// Obtener todas las categorías disponibles, incluyendo el precio
$categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias";
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

// Obtener todas las condiciones de IVA disponibles
$condicionesIVAQuery = "SELECT id_iva, descripcion FROM condicional_iva"; // Asegúrate de que el nombre de la tabla y los campos sean correctos
$condicionesIVAResult = $conn->query($condicionesIVAQuery);
$condicionesIVA = [];
while ($row = $condicionesIVAResult->fetch_assoc()) {
    $condicionesIVA[] = $row;
}

// Devolver todas las listas en un solo objeto JSON
echo json_encode([
    "categorias" => $categorias,
    "mediosPago" => $mediosPago,
    "condicionesIVA" => $condicionesIVA // Agregar las condiciones de IVA
]);

$conn->close();
?>