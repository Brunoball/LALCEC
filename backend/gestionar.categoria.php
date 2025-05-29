<?php
require_once "db.php"; // Importar la conexión a la BD

function obtener_categoria() {
    global $conn;
    $sql = "SELECT Nombre_Categoria, Precio_Categoria FROM categorias";
    $result = $conn->query($sql);

    $categorias = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $categorias[] = $row;
        }
    }

    return $categorias;
}

// Enviar respuesta JSON
header('Content-Type: application/json');
echo json_encode(obtener_categoria());
?>
