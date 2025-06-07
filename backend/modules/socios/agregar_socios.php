<?php
// backend/agregarsocios.php

// Incluir la conexión a la base de datos
include_once(__DIR__ . '/../../config/db.php');

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
        return isset($dato) && $dato !== '' ? mb_strtoupper($conn->real_escape_string($dato), 'UTF-8') : NULL;
    }

    // Obtener datos (solo nombre y apellido son obligatorios)
    $nombre = isset($data['nombre']) ? limpiarDato($data['nombre']) : NULL;
    $apellido = isset($data['apellido']) ? limpiarDato($data['apellido']) : NULL;
    $dni = isset($data['dni']) ? limpiarDato($data['dni']) : NULL;
    $email = isset($data['email']) ? trim(strtolower($data['email'])) : '';
    $telefono = isset($data['telefono']) ? limpiarDato($data['telefono']) : NULL;
    $domicilio = isset($data['domicilio']) ? limpiarDato($data['domicilio']) : NULL;
    $domicilio_2 = isset($data['domicilio_2']) ? limpiarDato($data['domicilio_2']) : NULL;
    $localidad = isset($data['localidad']) ? limpiarDato($data['localidad']) : NULL;
    $numero = isset($data['numero']) ? limpiarDato($data['numero']) : NULL;
    $idCategoria = isset($data['idCategoria']) ? limpiarDato($data['idCategoria']) : NULL;
    $idMedios_Pago = isset($data['idMedios_Pago']) ? limpiarDato($data['idMedios_Pago']) : NULL;
    $observacion = isset($data['observacion']) ? limpiarDato($data['observacion']) : NULL;
    $fecha_union = date("Y-m-d"); // Obtener la fecha actual en formato YYYY-MM-DD

    // Validaciones de los datos
    function validarCampoNombreApellido($valor, $campo) {
        if ($valor !== NULL && (!preg_match("/^[a-zA-ZñÑ\s.]+$/u", $valor) || strlen($valor) > 40)) {
            echo json_encode(["error_message" => "El campo $campo solo puede contener letras (incluyendo ñ/Ñ), puntos y espacios, con un máximo de 40 caracteres."]);
            exit();
        }
    }

    function validarCampoDni($valor) {
        if ($valor !== NULL && (!preg_match("/^[0-9.]+$/", $valor) || strlen($valor) > 20)) {
            echo json_encode(["error_message" => "El DNI solo puede contener números y puntos, con un máximo de 20 caracteres."]);
            exit();
        }
    }

    function validarCampoLocalidad($valor) {
        if ($valor !== NULL && (!preg_match("/^[a-zA-ZñÑ\s.]+$/u", $valor) || strlen($valor) > 40)) {
            echo json_encode(["error_message" => "La localidad solo puede contener letras (incluyendo ñ/Ñ), puntos y espacios, con un máximo de 40 caracteres."]);
            exit();
        }
    }

    function validarCampoDomicilio($valor) {
        if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.]+$/u", $valor) || strlen($valor) > 40)) {
            echo json_encode(["error_message" => "El domicilio solo puede contener letras (incluyendo ñ/Ñ), números, puntos y espacios, con un máximo de 40 caracteres."]);
            exit();
        }
    }

    function validarCampoNumerico($valor, $campo, $maxLength) {
        if ($valor !== NULL && (!preg_match("/^[0-9]+$/", $valor) || strlen($valor) > $maxLength)) {
            echo json_encode(["error_message" => "El campo $campo solo puede contener números y un máximo de $maxLength caracteres."]);
            exit();
        }
    }

    function validarCampoDomicilio2($valor) {
        if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.]+$/u", $valor) || strlen($valor) > 40)) {
            echo json_encode(["error_message" => "El domicilio 2 solo puede contener letras (incluyendo ñ/Ñ), números, puntos y espacios, con un máximo de 40 caracteres."]);
            exit();
        }
    }

    function validarCampoObservacion($valor) {
        if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.]+$/u", $valor) || strlen($valor) > 60)) {
            echo json_encode(["error_message" => "La observación solo puede contener letras (incluyendo ñ/Ñ), números, puntos y espacios, con un máximo de 60 caracteres."]);
            exit();
        }
    }

    // Validar campos obligatorios
    if ($nombre === NULL) {
        echo json_encode(["error_message" => "El nombre es obligatorio"]);
        exit();
    }

    if ($apellido === NULL) {
        echo json_encode(["error_message" => "El apellido es obligatorio"]);
        exit();
    }

    // Aplicar validaciones
    validarCampoNombreApellido($nombre, "Nombre");
    validarCampoNombreApellido($apellido, "Apellido");
    validarCampoDni($dni);
    validarCampoLocalidad($localidad);
    validarCampoDomicilio($domicilio);
    validarCampoNumerico($numero, "Número", 20);

    if ($telefono !== NULL && (!preg_match("/^[0-9\-]+$/", $telefono) || strlen($telefono) > 20)) {
        echo json_encode(["error_message" => "El teléfono solo puede contener números y guiones, con un máximo de 20 caracteres."]);
        exit();
    }

    validarCampoDomicilio2($domicilio_2);
    validarCampoObservacion($observacion);

    if ($email !== '' && !preg_match("/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i", $email)) {
        echo json_encode(["error_message" => "El email ingresado debe ser válido y terminar en '.com'."]);
        exit();
    }

    // Consulta para insertar el nuevo socio incluyendo la fecha de unión
    $query = "INSERT INTO socios (nombre, apellido, dni, email, telefono, domicilio, domicilio_2, localidad, numero, idCategoria, idMedios_Pago, observacion, Fechaunion)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($query);
    $stmt->bind_param(
        "sssssssssssss",
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
        $observacion,
        $fecha_union
    );

    if ($stmt->execute()) {
        echo json_encode(["success_message" => "Socio agregado con éxito"]);
    } else {
        echo json_encode(["error_message" => "Error al agregar socio: " . $stmt->error . " (Código de error: " . $conn->errno . ")"]);
    }

    $stmt->close();
} else {
    echo json_encode(["error_message" => "Método no permitido. Se esperaba POST"]);
}

$conn->close();
?>