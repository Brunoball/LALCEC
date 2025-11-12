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

// -------- Utilidades de respuesta ----------
function sendResponse($success, $message, $data = null) {
    header('Content-Type: application/json');
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

// -------- Sanitización / Validación ----------
function limpiarDato($dato) {
    global $conn;
    // Convierte a MAYÚSCULAS (no afecta números) y escapa
    return isset($dato) && $dato !== '' ? mb_strtoupper($conn->real_escape_string($dato), 'UTF-8') : NULL;
}

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

function validarCampoFecha($valor) {
    if ($valor !== NULL) {
        // Formato esperado YYYY-MM-DD
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) {
            sendResponse(false, "La fecha de unión debe tener el formato AAAA-MM-DD.");
        }
        // Validación de fecha real
        [$y,$m,$d] = explode('-', $valor);
        if (!checkdate((int)$m, (int)$d, (int)$y)) {
            sendResponse(false, "La fecha de unión no es válida.");
        }
    }
}

// -------- Captura de datos ----------
$idSocios     = isset($data['idSocios']) ? limpiarDato($data['idSocios']) : (isset($data['id']) ? limpiarDato($data['id']) : NULL);
$nombre       = isset($data['nombre']) ? limpiarDato($data['nombre']) : NULL;
$apellido     = isset($data['apellido']) ? limpiarDato($data['apellido']) : NULL;
$dni          = isset($data['dni']) ? limpiarDato($data['dni']) : NULL;

// email: lo mantenemos en minúsculas, sin upper
$email        = isset($data['email']) ? trim(strtolower($data['email'])) : '';

$telefono     = isset($data['telefono']) ? limpiarDato($data['telefono']) : NULL;
$domicilio    = isset($data['domicilio']) ? limpiarDato($data['domicilio']) : NULL;
$domicilio_2  = isset($data['domicilio_2']) ? limpiarDato($data['domicilio_2']) : NULL;
$localidad    = isset($data['localidad']) ? limpiarDato($data['localidad']) : NULL;
$numero       = isset($data['numero']) ? limpiarDato($data['numero']) : NULL;

$idCategoria  = isset($data['categoria']) ? ( ($data['categoria'] === '' || $data['categoria'] === null) ? NULL : (int)$data['categoria'] ) : NULL;
$idMediosPago = isset($data['medioPago']) ? ( ($data['medioPago'] === '' || $data['medioPago'] === null) ? NULL : (int)$data['medioPago'] ) : NULL;

$observacion  = isset($data['observacion']) && $data['observacion'] !== '' ? limpiarDato($data['observacion']) : NULL;

// NUEVO: fecha de unión
$fechaUnion   = isset($data['fechaUnion']) && $data['fechaUnion'] !== '' ? $data['fechaUnion'] : NULL; // mantener como string YYYY-MM-DD

// -------- Validaciones ----------
if ($idSocios === NULL) {
    sendResponse(false, "Falta el ID del socio para actualizar");
}
if ($nombre === NULL) {
    sendResponse(false, "El nombre es obligatorio");
}
if ($apellido === NULL) {
    sendResponse(false, "El apellido es obligatorio");
}

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
validarCampoFecha($fechaUnion);

// Nota: si querés permitir dominios distintos a .com, ajustá este regex
if ($email !== '' && !preg_match("/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i", $email)) {
    sendResponse(false, "El email ingresado debe ser válido y terminar en '.com'.");
}

// -------- UPDATE ----------
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
        observacion = ?,
        Fechaunion = ?
    WHERE idSocios = ?
";

$stmt = $conn->prepare($query);
if ($stmt === false) {
    sendResponse(false, "Error al preparar la consulta: " . $conn->error);
}

// Tipos (14 params): 9s + 2i + 2s + 1i  => 'sssssssss' . 'ii' . 'ss' . 'i' = 'sssssssssiissi'
$bindResult = $stmt->bind_param(
    'sssssssssiissi',
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
    $fechaUnion,
    $idSocios
);

if ($bindResult === false) {
    sendResponse(false, "Error al enlazar parámetros: " . $stmt->error);
}

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        sendResponse(true, "Socio actualizado correctamente");
    } else {
        // Puede ser que los valores nuevos sean idénticos a los existentes
        sendResponse(false, "No se encontraron cambios para actualizar");
    }
} else {
    sendResponse(false, "Error al actualizar socio: " . $stmt->error);
}

$stmt->close();
$conn->close();
?>
