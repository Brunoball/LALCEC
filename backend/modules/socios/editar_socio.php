<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once(__DIR__ . '/../../config/db.php');

// Función para enviar respuestas consistentes
function sendResponse($success, $message, $data = null) {
    header('Content-Type: application/json');
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

// Función para limpiar datos
function limpiarDato($dato) {
    global $conn;
    return isset($dato) && $dato !== '' ? mb_strtoupper($conn->real_escape_string($dato), 'UTF-8') : NULL;
}

// Validaciones de los datos
function validarCampoNombreApellido($valor, $campo) {
    if ($valor !== NULL && (!preg_match("/^[a-zA-ZñÑ\s.]+$/u", $valor) || strlen($valor) > 40)) {
        sendResponse(false, "El campo $campo solo puede contener letras (incluyendo ñ/Ñ), puntos y espacios, con un máximo de 40 caracteres.");
    }
}

function validarCampoDni($valor) {
    if ($valor !== NULL && (!preg_match("/^[0-9.]+$/", $valor) || strlen($valor) > 20)) {
        sendResponse(false, "El DNI solo puede contener números y puntos, con un máximo de 20 caracteres.");
    }
}

function validarCampoLocalidad($valor) {
    if ($valor !== NULL && (!preg_match("/^[a-zA-ZñÑ\s.]+$/u", $valor) || strlen($valor) > 40)) {
        sendResponse(false, "La localidad solo puede contener letras (incluyendo ñ/Ñ), puntos y espacios, con un máximo de 40 caracteres.");
    }
}

function validarCampoDomicilio($valor) {
    if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.]+$/u", $valor) || strlen($valor) > 40)) {
        sendResponse(false, "El domicilio solo puede contener letras (incluyendo ñ/Ñ), números, puntos y espacios, con un máximo de 40 caracteres.");
    }
}

function validarCampoNumerico($valor, $campo, $maxLength) {
    if ($valor !== NULL && (!preg_match("/^[0-9]+$/", $valor) || strlen($valor) > $maxLength)) {
        sendResponse(false, "El campo $campo solo puede contener números y un máximo de $maxLength caracteres.");
    }
}

function validarCampoDomicilio2($valor) {
    if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.]+$/u", $valor) || strlen($valor) > 40)) {
        sendResponse(false, "El domicilio 2 solo puede contener letras (incluyendo ñ/Ñ), números, puntos y espacios, con un máximo de 40 caracteres.");
    }
}

function validarCampoObservacion($valor) {
    if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.,-]+$/u", $valor) || strlen($valor) > 60)) {
        sendResponse(false, "La observación solo puede contener letras (incluyendo ñ/Ñ), números, puntos, comas, guiones y espacios, con un máximo de 60 caracteres.");
    }
}

// Capturar y limpiar datos desde el request
$idSocios = isset($data['idSocios']) ? limpiarDato($data['idSocios']) : (isset($data['id']) ? limpiarDato($data['id']) : NULL);
$nombre = isset($data['nombre']) ? limpiarDato($data['nombre']) : NULL;
$apellido = isset($data['apellido']) ? limpiarDato($data['apellido']) : NULL;
$dni = isset($data['dni']) ? limpiarDato($data['dni']) : NULL;
$email = isset($data['email']) ? trim(strtolower($data['email'])) : '';
$telefono = isset($data['telefono']) ? limpiarDato($data['telefono']) : NULL;
$domicilio = isset($data['domicilio']) ? limpiarDato($data['domicilio']) : NULL;
$domicilio_2 = isset($data['domicilio_2']) ? limpiarDato($data['domicilio_2']) : NULL;
$localidad = isset($data['localidad']) ? limpiarDato($data['localidad']) : NULL;
$numero = isset($data['numero']) ? limpiarDato($data['numero']) : NULL;
$idCategoria = isset($data['categoria']) ? intval($data['categoria']) : NULL;
$idMediosPago = isset($data['medioPago']) ? intval($data['medioPago']) : NULL;
$observacion = isset($data['observacion']) && $data['observacion'] !== '' ? limpiarDato($data['observacion']) : NULL;

// Validar que exista un ID de socio
if ($idSocios === NULL) {
    sendResponse(false, "Falta el ID del socio para actualizar");
}

// Validar campos obligatorios
if ($nombre === NULL) {
    sendResponse(false, "El nombre es obligatorio");
}

if ($apellido === NULL) {
    sendResponse(false, "El apellido es obligatorio");
}

// Aplicar validaciones
validarCampoNombreApellido($nombre, "Nombre");
validarCampoNombreApellido($apellido, "Apellido");
validarCampoDni($dni);
validarCampoLocalidad($localidad);
validarCampoDomicilio($domicilio);
validarCampoNumerico($numero, "Número", 20);

if ($telefono !== NULL && (!preg_match("/^[0-9\-]+$/", $telefono) || strlen($telefono) > 20)) {
    sendResponse(false, "El teléfono solo puede contener números y guiones, con un máximo de 20 caracteres.");
}

validarCampoDomicilio2($domicilio_2);
validarCampoObservacion($observacion);

if ($email !== '' && !preg_match("/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i", $email)) {
    sendResponse(false, "El email ingresado debe ser válido y terminar en '.com'.");
}

// Consulta para actualizar el socio
$query = "
    UPDATE socios 
    SET 
        nombre = ?, 
        apellido = ?, 
        dni = ?, 
        email = ?, 
        telefono = ?, 
        domicilio = ?, 
        domicilio_2 = ?, 
        localidad = ?, 
        numero = ?, 
        idCategoria = ?, 
        idMedios_Pago = ?, 
        observacion = ?
    WHERE idSocios = ?
";

$stmt = $conn->prepare($query);
if ($stmt === false) {
    sendResponse(false, "Error al preparar la consulta: " . $conn->error);
}

// Cambiar el tipo de parámetro para observación de 'i' a 's'
$bindResult = $stmt->bind_param(
    'sssssssssiisi',
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
    $idMediosPago, 
    $observacion,
    $idSocios
);

if ($bindResult === false) {
    sendResponse(false, "Error al enlazar parámetros: " . $stmt->error);
}

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        sendResponse(true, "Socio actualizado correctamente");
    } else {
        sendResponse(false, "No se encontraron cambios para actualizar");
    }
} else {
    sendResponse(false, "Error al actualizar socio: " . $stmt->error);
}

$stmt->close();
$conn->close();
?>