<?php

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

include 'db.php';

// Obtener datos del request
$data = json_decode(file_get_contents('php://input'), true);

// Comprobamos si es una solicitud POST para actualizar la categoría
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nombre_categoria = $data['nombre_categoria'] ?? null;
    $nombre = $data['nombre'] ?? null;
    $precio = $data['precio'] ?? null;

    if ($nombre_categoria && $nombre && $precio) {
        // Escapar los datos para prevenir inyecciones SQL
        $nombre_categoria = $conn->real_escape_string($nombre_categoria);
        $nombre = $conn->real_escape_string($nombre);
        $precio = $conn->real_escape_string($precio);

        $query = "UPDATE categorias SET Nombre_Categoria = '$nombre', Precio_Categoria = '$precio' WHERE Nombre_Categoria = '$nombre_categoria'";

        if ($conn->query($query)) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => '❌ Error al actualizar la categoría: ' . $conn->error]);
        }
    } else {
        echo json_encode(['error' => '⚠️ Faltan datos para actualizar la categoría']);
    }
    exit();
}

// Si es una solicitud GET, seguimos con la lógica de obtener la categoría
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if (!isset($_GET['nombre_categoria']) || empty($_GET['nombre_categoria'])) {
        echo json_encode(['error' => '⚠️ Falta el parámetro nombre_categoria']);
        exit();
    }

    $nombre_categoria = $_GET['nombre_categoria'];
    $nombre_categoria = $conn->real_escape_string($nombre_categoria);
    $query = "SELECT * FROM categorias WHERE Nombre_Categoria = '$nombre_categoria'";
    $result = $conn->query($query);

    if (!$result) {
        echo json_encode(['error' => '❌ Error en la consulta SQL: ' . $conn->error]);
        exit();
    }

    if ($result->num_rows > 0) {
        $categoria = $result->fetch_assoc();
        echo json_encode(['data' => $categoria]);
    } else {
        echo json_encode(['error' => '⚠️ Categoría no encontrada']);
    }
}

$conn->close();
