<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once(__DIR__ . '/../../config/db.php'); // $conn = new mysqli(...)

$action = $_GET['action'] ?? null;

// Lee JSON si viene
$input = json_decode(file_get_contents('php://input'), true) ?: [];

// Normaliza posibles nombres de parámetros
$id_socio = $input['id_socio'] ?? $_POST['id_socio'] ?? $_GET['idSoc'] ?? null;
$nombre   = $input['nombre']   ?? $_POST['nombre']   ?? $_GET['nombre'] ?? null;
$apellido = $input['apellido'] ?? $_POST['apellido'] ?? $_GET['apellido'] ?? null;

if ($action === 'eliminar_socio') {

    // 1) Prioriza eliminar por ID (recomendado)
    if (!empty($id_socio)) {
        $stmt = $conn->prepare("DELETE FROM socios WHERE idSocios = ?");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["exito" => false, "mensaje" => "Error al preparar la consulta"]);
            exit;
        }
        $stmt->bind_param('i', $id_socio);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            echo json_encode(["exito" => true, "mensaje" => "Socio eliminado correctamente"]);
        } else {
            http_response_code(404);
            echo json_encode(["exito" => false, "mensaje" => "Socio no encontrado"]);
        }
        $stmt->close();
        $conn->close();
        exit;
    }

    // 2) Fallback: eliminar por nombre y apellido si así lo necesitás
    if (!empty($nombre) && !empty($apellido)) {
        $stmt = $conn->prepare("DELETE FROM socios WHERE nombre = ? AND apellido = ?");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["exito" => false, "mensaje" => "Error al preparar la consulta"]);
            exit;
        }
        $stmt->bind_param('ss', $nombre, $apellido);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            echo json_encode(["exito" => true, "mensaje" => "Socio eliminado por nombre y apellido"]);
        } else {
            http_response_code(404);
            echo json_encode(["exito" => false, "mensaje" => "Socio no encontrado para eliminar"]);
        }
        $stmt->close();
        $conn->close();
        exit;
    }

    // Si no vino ni id_socio ni (nombre+apellido), es 400
    http_response_code(400);
    echo json_encode(["exito" => false, "mensaje" => "Falta id_socio o nombre y apellido"]);
    $conn->close();
    exit;
}

// Si llega otra acción
http_response_code(400);
echo json_encode(["exito" => false, "mensaje" => "Acción inválida"]);
$conn->close();
