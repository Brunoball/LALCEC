<?php
/**
 * Responde a routes/api.php?action=inicio
 * - Acepta JSON con: { usuario, contraseña }  (oficial)
 * - También acepta:  { nombre, contrasena }   (compatibilidad)
 * - Devuelve: { exito: bool, mensaje: string, usuario?: {id, usuario}, token?: string }
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once(__DIR__ . '/../../config/db.php');

function handleLogin(mysqli $conn) {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true) ?? [];

    // Aceptar ambas variantes de nombres
    $usuario    = $body['usuario']     ?? $body['nombre']     ?? null;
    $contrasena = $body['contraseña']  ?? $body['contrasena'] ?? null;

    if (!$usuario || !$contrasena) {
        echo json_encode(['exito' => false, 'mensaje' => 'Usuario y contraseña son requeridos']);
        return;
    }

    // Adaptado a agenda.login -> id_user, usuario, contraseña
    $sql = "SELECT id_user AS id, usuario, `contraseña` AS hash FROM login WHERE usuario = ?";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode(['exito' => false, 'mensaje' => 'Error de servidor (prepare)']);
        return;
    }

    $stmt->bind_param('s', $usuario);
    if (!$stmt->execute()) {
        echo json_encode(['exito' => false, 'mensaje' => 'Error de servidor (execute)']);
        return;
    }

    $res = $stmt->get_result();
    if (!$res || $res->num_rows === 0) {
        echo json_encode(['exito' => false, 'mensaje' => 'Usuario o contraseña incorrectos']);
        return;
    }

    $row     = $res->fetch_assoc();
    $hash_bd = $row['hash'];

    if (!is_string($hash_bd) || $hash_bd === '') {
        echo json_encode(['exito' => false, 'mensaje' => 'Usuario mal configurado']);
        return;
    }

    if (password_verify($contrasena, $hash_bd)) {
        // Token simple de sesión (ejemplo)
        try {
            $token = bin2hex(random_bytes(16));
        } catch (Throwable $e) {
            $token = bin2hex(md5(uniqid((string)mt_rand(), true), true));
        }

        echo json_encode([
            'exito'   => true,
            'mensaje' => 'Inicio de sesión exitoso',
            'usuario' => [
                'id'      => (int)$row['id'],   // <- viene de id_user AS id
                'usuario' => $row['usuario'],
            ],
            'token'   => $token,
        ]);
    } else {
        echo json_encode(['exito' => false, 'mensaje' => 'Usuario o contraseña incorrectos']);
    }
}

handleLogin($conn);
