<?php
// backend/agregar_empresa.php

// Habilitar CORS
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Si es una solicitud OPTIONS, terminar la ejecución
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Incluir la conexión a la base de datos
include(__DIR__ . '/db.php');

// Verificar si la solicitud es un POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Obtener los datos enviados desde la solicitud
    $data = json_decode(file_get_contents("php://input"), true);

    // Si no se reciben datos, devolver error
    if (!$data) {
        echo json_encode(["error_message" => "No se recibieron datos válidos"]);
        exit;
    }

    // Función para limpiar los datos
    function limpiarDato($dato) {
        global $conn;
        return isset($dato) && trim($dato) !== '' ? strtoupper($conn->real_escape_string(trim($dato))) : NULL;
    }

    // Función para limpiar y convertir a entero
    function limpiarEntero($dato) {
        return isset($dato) && is_numeric($dato) ? (int)$dato : NULL;
    }

    // Obtener y limpiar los datos (todos pueden ser NULL o valores predeterminados)
    $razon_social = limpiarDato($data['razon_social'] ?? NULL);
    $cuit = limpiarDato($data['cuit'] ?? '');  // Puede ser vacío
    $cond_iva = limpiarDato($data['cond_iva'] ?? 'No especificado');  // Valor predeterminado
    $domicilio = limpiarDato($data['domicilio'] ?? 'No especificado');  // Valor predeterminado
    $telefono = limpiarDato($data['telefono'] ?? NULL);
    $email = isset($data['email']) && trim($data['email']) !== '' ? trim(strtolower($data['email'])) : NULL;
    $observacion = limpiarDato($data['observacion'] ?? NULL);
    $idCategorias = limpiarEntero($data['idCategoria'] ?? NULL);
    $idMedios_Pago = limpiarEntero($data['idMedios_Pago'] ?? NULL);

    // Validaciones
    if (!$razon_social) {
        echo json_encode(["error_message" => "El campo Razón Social es obligatorio."]);
        exit();
    }

    if ($email !== NULL && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["error_message" => "El email ingresado no es válido."]);
        exit();
    }

    // Verificar si el CUIT ya existe en la base de datos antes de insertarlo
    if (!empty($cuit)) {
        $checkCuitQuery = "SELECT idEmp FROM empresas WHERE cuit = ?";
        $checkCuitStmt = $conn->prepare($checkCuitQuery);
        $checkCuitStmt->bind_param("s", $cuit);
        $checkCuitStmt->execute();
        $checkCuitStmt->store_result();

        if ($checkCuitStmt->num_rows > 0) {
            echo json_encode(["error_message" => "El CUIT ya está registrado en otra empresa."]);
            exit();
        }

        $checkCuitStmt->close();
    }

    // Verificar si idCategorias existe en la tabla categorias (si se proporciona)
    if ($idCategorias !== NULL) {
        $checkQuery = "SELECT idCategorias FROM categorias WHERE idCategorias = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param("i", $idCategorias);
        $checkStmt->execute();
        $checkStmt->store_result();

        if ($checkStmt->num_rows === 0) {
            echo json_encode(["error_message" => "El idCategorias proporcionado no existe en la tabla categorias."]);
            exit();
        }
        $checkStmt->close();
    }

    // Consulta para insertar la nueva empresa
    $query = "INSERT INTO empresas (razon_social, cuit, cond_iva, domicilio, telefono, email, observacion, idCategorias, idMedios_Pago) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($query);
    $stmt->bind_param(
        "sssssssii",
        $razon_social, 
        $cuit, 
        $cond_iva, 
        $domicilio, 
        $telefono, 
        $email, 
        $observacion, 
        $idCategorias,  
        $idMedios_Pago  
    );

    if ($stmt->execute()) {
        echo json_encode(["success_message" => "Empresa agregada con éxito"]);
    } else {
        echo json_encode(["error_message" => "Error al agregar empresa: " . $conn->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["error_message" => "Método no permitido. Se esperaba POST"]);
}

$conn->close();
?>
