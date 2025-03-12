<?php
// backend/agregar_empresa.php

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include(__DIR__ . '/db.php');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data) {
        echo json_encode(["error_message" => "No se recibieron datos válidos"]);
        exit;
    }

    function limpiarDato($dato) {
        global $conn;
        return isset($dato) && trim($dato) !== '' ? strtoupper($conn->real_escape_string(trim($dato))) : NULL;
    }

    function limpiarEntero($dato) {
        return isset($dato) && is_numeric($dato) ? (int)$dato : NULL;
    }

    $razon_social = limpiarDato($data['razon_social'] ?? NULL);
    $cuit = limpiarDato($data['cuit'] ?? '');
    $cond_iva = limpiarEntero($data['cond_iva'] ?? NULL); // Obtener el id_iva directamente
    $domicilio = limpiarDato($data['domicilio'] ?? 'No especificado');
    $domicilio_2 = limpiarDato($data['domicilio_2'] ?? NULL);
    $telefono = limpiarDato($data['telefono'] ?? NULL);
    $email = isset($data['email']) && trim($data['email']) !== '' ? trim(strtolower($data['email'])) : NULL;
    $observacion = limpiarDato($data['observacion'] ?? NULL);
    $idCategorias = limpiarEntero($data['idCategoria'] ?? NULL);
    $idMedios_Pago = limpiarEntero($data['idMedios_Pago'] ?? NULL);

    // Verificar que la razón social sea obligatoria
    if (!$razon_social) {
        echo json_encode(["error_message" => "El campo Razón Social es obligatorio."]);
        exit();
    }

    // Validar el email
    if ($email !== NULL && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["error_message" => "El email ingresado no es válido."]);
        exit();
    }

    // Validar si la categoría existe en la base de datos
    if ($idCategorias !== NULL) {
        $checkQuery = "SELECT idCategorias FROM categorias WHERE idCategorias = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param("i", $idCategorias);
        $checkStmt->execute();
        $checkStmt->store_result();

        if ($checkStmt->num_rows === 0) {
            echo json_encode(["error_message" => "El idCategoria proporcionado no existe en la tabla categorias."]);
            exit();
        }
        $checkStmt->close();
    }

    // Verificar si el id_iva existe en la base de datos
    if ($cond_iva !== NULL) {
        $checkCondIVAQuery = "SELECT id_iva FROM condicional_iva WHERE id_iva = ?";
        $checkCondIVAStmt = $conn->prepare($checkCondIVAQuery);
        $checkCondIVAStmt->bind_param("i", $cond_iva);
        $checkCondIVAStmt->execute();
        $checkCondIVAStmt->store_result();

        if ($checkCondIVAStmt->num_rows === 0) {
            echo json_encode(["error_message" => "La condición de IVA seleccionada no existe."]);
            exit();
        }
        $checkCondIVAStmt->close();
    }

    // Insertar los datos en la tabla 'empresas'
    $query = "INSERT INTO empresas (razon_social, cuit, id_iva, domicilio, domicilio_2, telefono, email, observacion, idCategorias, idMedios_Pago) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($query);
    $stmt->bind_param(
        "ssissssiii",
        $razon_social, 
        $cuit, 
        $cond_iva, // Insertar el id_iva directamente
        $domicilio, 
        $domicilio_2,
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
