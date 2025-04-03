<?php
header('Access-Control-Allow-Origin: *'); // Permitir CORS
header('Content-Type: application/json');

require 'db.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$id = $_GET['id'] ?? null;

if (!$id) {
    echo json_encode(["success" => false, "message" => "ID de socio no proporcionado"]);
    exit;
}

try {
    $query = $pdo->prepare("SELECT * FROM socios WHERE idSocios = ?");
    $query->execute([$id]);
    $socio = $query->fetch(PDO::FETCH_ASSOC);

    if (!$socio) {
        echo json_encode(["success" => false, "message" => "Socio no encontrado"]);
        exit;
    }

    echo json_encode(["success" => true, "data" => $socio]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
}
?>
