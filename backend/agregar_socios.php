<?php
// backend/agregarsocios.php

// Incluir la conexión a la base de datos
include(__DIR__ . '/db.php');

// Verificar si la solicitud es un POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Obtener los datos enviados desde la solicitud
    $data = json_decode(file_get_contents("php://input"), true);

    // Verificar si los datos fueron recibidos correctamente
    if (!$data) {
        echo json_encode(["error_message" => "No se recibieron datos válidos"]);
        exit;
    }

    function limpiarDato($dato) {
        global $conn;
        return isset($dato) && $dato !== '' ? strtoupper($conn->real_escape_string($dato)) : NULL;
    }

    $nombre = limpiarDato($data['nombre']);
    $apellido = limpiarDato($data['apellido']);
    $dni = limpiarDato($data['dni']);
    $email = trim(strtolower($data['email'] ?? ''));
    $telefono = limpiarDato($data['telefono']);
    $domicilio = limpiarDato($data['domicilio']);
    $domicilio_2 = limpiarDato($data['domicilio_2']);
    $localidad = limpiarDato($data['localidad']);
    $numero = limpiarDato($data['numero']);
    $idCategoria = limpiarDato($data['idCategoria']);
    $idMedios_Pago = limpiarDato($data['idMedios_Pago']);
    $observacion = limpiarDato($data['observacion']);

    // Validaciones de los datos
    function validarCampoTexto($valor, $campo) {
        if ($valor !== NULL && (!preg_match("/^[a-zA-Z\s]+$/", $valor) || strlen($valor) > 40)) {
            echo json_encode(["error_message" => "El campo $campo solo puede contener letras y un máximo de 40 caracteres."]);
            exit();
        }
    }

    function validarCampoNumerico($valor, $campo, $maxLength) {
        if ($valor !== NULL && (!preg_match("/^[0-9]+$/", $valor) || strlen($valor) > $maxLength)) {
            echo json_encode(["error_message" => "El campo $campo solo puede contener números y un máximo de $maxLength caracteres."]);
            exit();
        }
    }

    validarCampoTexto($nombre, "Nombre");
    validarCampoTexto($apellido, "Apellido");
    validarCampoTexto($localidad, "Localidad");
    validarCampoTexto($domicilio, "Domicilio");

    validarCampoNumerico($dni, "DNI", 20);
    validarCampoNumerico($numero, "Número", 20);
    
    if ($telefono !== NULL && (!preg_match("/^[0-9\-]+$/", $telefono) || strlen($telefono) > 20)) {
        echo json_encode(["error_message" => "El teléfono solo puede contener números y guiones, con un máximo de 20 caracteres."]);
        exit();
    }

    if ($domicilio_2 !== NULL && (!preg_match("/^[a-zA-Z0-9\s]+$/", $domicilio_2) || strlen($domicilio_2) > 40)) {
        echo json_encode(["error_message" => "El domicilio 2 solo puede contener letras y números con un máximo de 40 caracteres."]);
        exit();
    }

    if ($observacion !== NULL && (!preg_match("/^[a-zA-Z0-9\s]+$/", $observacion) || strlen($observacion) > 40)) {
        echo json_encode(["error_message" => "El campo Observación solo puede contener letras, números y un máximo de 40 caracteres."]);
        exit();
    }

    if ($email !== '' && !preg_match("/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i", $email)) {
        echo json_encode(["error_message" => "El email ingresado debe ser válido y terminar en '.com'."]);
        exit();
    }

    // Consulta para insertar el nuevo socio
    $query = "INSERT INTO socios (nombre, apellido, dni, email, telefono, domicilio, domicilio_2, localidad, numero, idCategoria, idMedios_Pago, observacion) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($query);
    $stmt->bind_param(
        "ssssssssssss", 
        $nombre, 
        $apellido, 
        $dni, 
        $email, 
        $telefono, 
        $domicilio, 
        $domicilio_2, 
        $localidad, 
        $numero, 
        $idCategoria, 
        $idMedios_Pago, 
        $observacion
    );

    if ($stmt->execute()) {
        echo json_encode(["success_message" => "Socio agregado con éxito"]);
    } else {
        echo json_encode(["error_message" => "Error al agregar socio: " . $conn->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["error_message" => "Método no permitido. Se esperaba POST"]);
}

$conn->close();
?>