<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include(__DIR__ . '/db.php');

// Manejo de preflight request (CORS)
if ($_SERVER["REQUEST_METHOD"] == "OPTIONS") {
    http_response_code(200);
    exit();
}

// Solo aceptar solicitudes POST
if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit();
}

// Leer datos del JSON recibido
$datos = json_decode(file_get_contents("php://input"), true);

// Validar datos recibidos
if (!isset($datos["razonSocial"]) || empty(trim($datos["razonSocial"]))) {
    echo json_encode([
        "success" => false, 
        "message" => "Datos incompletos", 
        "received_data" => $datos
    ]);
    exit();
}

$razonSocial = trim($datos["razonSocial"]);

try {
    // Buscar el idCategorias de la empresa (con LIKE para mayor flexibilidad)
    $stmt = $conn->prepare("SELECT idCategorias FROM empresas WHERE razon_social LIKE ?");
    $razonSocialParam = "%" . $razonSocial . "%";
    $stmt->bind_param("s", $razonSocialParam);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if ($resultado->num_rows == 0) {
        // Registrar el error para depuración
        error_log("Empresa no encontrada: " . $razonSocial);
        
        // Consulta adicional para ver qué empresas existen (solo para depuración)
        $debugStmt = $conn->prepare("SELECT razon_social FROM empresas LIMIT 5");
        $debugStmt->execute();
        $debugResult = $debugStmt->get_result();
        $empresasEjemplo = [];
        while ($fila = $debugResult->fetch_assoc()) {
            $empresasEjemplo[] = $fila['razon_social'];
        }
        
        echo json_encode([
            "success" => false, 
            "message" => "Empresa no encontrada", 
            "searching_for" => $razonSocial,
            "example_companies" => $empresasEjemplo
        ]);
        $stmt->close();
        $debugStmt->close();
        $conn->close();
        exit();
    }

    $fila = $resultado->fetch_assoc();
    $idCategorias = $fila["idCategorias"];
    $stmt->close();

    // Buscar el precio de la categoría
    $stmt = $conn->prepare("SELECT Precio_Categoria FROM categorias WHERE idCategorias = ?");
    $stmt->bind_param("i", $idCategorias);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if ($resultado->num_rows == 0) {
        echo json_encode([
            "success" => false, 
            "message" => "No se encontró la categoría",
            "idCategorias" => $idCategorias
        ]);
        $stmt->close();
        $conn->close();
        exit();
    }

    $fila = $resultado->fetch_assoc();
    $precioMes = $fila["Precio_Categoria"];

    echo json_encode([
        "success" => true, 
        "precioMes" => $precioMes,
        "razonSocial" => $razonSocial,
        "idCategorias" => $idCategorias
    ]);

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    echo json_encode([
        "success" => false, 
        "message" => "Error en el servidor",
        "error_details" => $e->getMessage()
    ]);
}
?>