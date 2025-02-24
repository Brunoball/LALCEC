<?php
// Incluir la conexión a la base de datos
include(__DIR__ . '/db.php');

// Mostrar errores (desactiva en producción)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Encabezados para CORS
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Manejo de preflight request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener la acción de la URL
$action = $_GET['action'] ?? null;

// Validar y manejar las acciones permitidas
try {
    switch ($action) {
        case 'login':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                include(__DIR__ . '/login.php');
            }
            break;
        case 'register':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                include(__DIR__ . '/register.php');
            }
            break;
        case 'obtener_socios':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                include(__DIR__ . '/gestion_socios.php');
            }
            break;
        case 'obtener_socio':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                include(__DIR__ . '/obtener_socio.php');
            }
            break;
        case 'agregarSocios':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                include(__DIR__ . '/agregar_socios.php');
            }
            break;
        case 'eliminar_socio':
            if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                include(__DIR__ . '/eliminar_socio.php');
            }
            break;
        case 'editar_socio':
            if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                include(__DIR__ . '/editar_socio.php');
            }
            break;
        case 'obtener_categoria':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                include(__DIR__ . '/gestionar.categoria.php');
            }
            break;
        case 'agregar_categoria':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                include(__DIR__ . '/agregar_categoria.php');
            }
            break;
        case 'editar_categoria':
            if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                include(__DIR__ . '/editar_categoria.php');
            }
            break;
            case 'eliminar_categoria':
                if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                    include(__DIR__ . '/eliminar_categoria.php');
                }
                break;
        default:
            // Acción no válida o método HTTP incorrecto
            http_response_code(404);
            echo json_encode([
                "status" => "error",
                "message" => "Ruta no encontrada o método HTTP incorrecto."
            ]);
            break;
    }
} catch (Exception $e) {
    // Manejo de errores inesperados
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Ocurrió un error en el servidor.",
        "error" => $e->getMessage()
    ]);
}
?>
