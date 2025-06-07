<?php
require_once(__DIR__ . '/../../config/db.php'); // Ruta corregida


function handleRegister($conn) {
    // Recibir datos JSON enviados desde el frontend
    $body = json_decode(file_get_contents('php://input'), true);
    $usuario = $body['usuario'] ?? null;
    $contraseña = $body['contraseña'] ?? null;

    if (!$usuario || !$contraseña) {
        echo json_encode(['error' => 'Usuario y contraseña son requeridos']);
        exit;
    }

    // Verificar si el usuario ya existe
    $query = "SELECT usuario FROM login WHERE usuario = ?";
    $stmt = $conn->prepare($query);

    if (!$stmt) {
        echo json_encode(['error' => 'Error al preparar la consulta: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param('s', $usuario);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        // Si el usuario ya existe, mostrar mensaje de error
        echo json_encode(['error' => 'El usuario ya existe']);
        $stmt->close();  // Asegúrate de cerrar la consulta
        exit;  // Detener la ejecución del script para que no continúe
    }

    $stmt->close(); // Cerrar la consulta después de la verificación

    // Si el usuario no existe, proceder con el registro
    $hashedPassword = password_hash($contraseña, PASSWORD_DEFAULT);

    $query = "INSERT INTO login (usuario, contraseña) VALUES (?, ?)";
    $stmt = $conn->prepare($query);

    if (!$stmt) {
        echo json_encode(['error' => 'Error al preparar la consulta: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param('ss', $usuario, $hashedPassword);

    if ($stmt->execute()) {
        echo json_encode(['message' => 'Usuario registrado con éxito']);
    } else {
        echo json_encode(['error' => 'Error al registrar el usuario: ' . $conn->error]);
    }

    $stmt->close(); // Cerrar la consulta de inserción
    $conn->close();  // Cerrar la conexión a la base de datos después de completar el proceso
}

handleRegister($conn);
?>
