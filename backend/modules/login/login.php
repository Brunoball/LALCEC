<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../config/db.php');

function handleLogin($conn) {
    $body = json_decode(file_get_contents('php://input'), true);
    $usuario = $body['usuario'] ?? null;
    $contraseña = $body['contraseña'] ?? null;

    if (!$usuario || !$contraseña) {
        echo json_encode(['error' => 'Usuario y contraseña son requeridos']);
        exit;
    }

    // Solo buscamos el hash, no la contraseña directamente
    $query = "SELECT contraseña FROM login WHERE usuario = ?";
    $stmt = $conn->prepare($query);

    if (!$stmt) {
        echo json_encode(['error' => 'Error al preparar la consulta: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param('s', $usuario);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['error' => 'Usuario o contraseña incorrectos']);
        exit;
    }

    $row = $result->fetch_assoc();
    $hash_bd = $row['contraseña'];

    // Acá comparamos el hash con la contraseña ingresada
    if (password_verify($contraseña, $hash_bd)) {
        echo json_encode([
            'success' => true,
            'message' => 'Inicio de sesión exitoso'
        ]);
    } else {
        echo json_encode(['error' => 'Usuario o contraseña incorrectos']);
    }
}

handleLogin($conn);
