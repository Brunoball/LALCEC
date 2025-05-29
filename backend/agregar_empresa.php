<?php
// backend/agregar_empresa.php

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

include(__DIR__ . '/db.php');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["error_message" => "Método no permitido. Se esperaba POST"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    echo json_encode(["error_message" => "No se recibieron datos válidos"]);
    exit;
}

// FUNCIONES DE LIMPIEZA
function limpiarTexto($dato) {
    global $conn;
    return isset($dato) && trim($dato) !== '' ? mb_strtoupper($conn->real_escape_string(trim($dato)), 'UTF-8') : NULL;
}

function limpiarEntero($dato) {
    return isset($dato) && is_numeric($dato) ? (int)$dato : NULL;
}

function validarCampoTexto($valor, $campo, $regex, $max) {
    if ($valor !== NULL && (!preg_match($regex, $valor) || strlen($valor) > $max)) {
        echo json_encode(["error_message" => "El campo $campo tiene un formato inválido o supera los $max caracteres."]);
        exit();
    }
}

// VALIDAR Y LIMPIAR DATOS
$razon_social = limpiarTexto($data['razon_social'] ?? '');
if (!$razon_social) {
    echo json_encode(["error_message" => "La Razón Social es obligatoria."]);
    exit();
}
validarCampoTexto($razon_social, "Razón Social", '/^[A-ZÑÁÉÍÓÚÜ.\s]+$/u', 60);

$cuit = trim($data['cuit'] ?? '');
if ($cuit !== '' && !preg_match('/^\d{2}-\d{8}-\d{1}$/', $cuit)) {
    echo json_encode(["error_message" => "El CUIT debe tener el formato XX-XXXXXXXX-X."]);
    exit();
}
$cuit = $cuit !== '' ? strtoupper($conn->real_escape_string($cuit)) : NULL;

$cond_iva = limpiarEntero($data['cond_iva'] ?? NULL);

$domicilio = limpiarTexto($data['domicilio'] ?? NULL);
validarCampoTexto($domicilio, "Domicilio", '/^[A-ZÑÁÉÍÓÚÜ0-9.\s]+$/u', 40);

$domicilio_2 = limpiarTexto($data['domicilio_2'] ?? NULL);
validarCampoTexto($domicilio_2, "Domicilio Alternativo", '/^[A-ZÑÁÉÍÓÚÜ0-9.\s]+$/u', 40);

$telefono = limpiarTexto($data['telefono'] ?? NULL);
if ($telefono !== NULL && (!preg_match('/^[0-9\- ]+$/', $telefono) || strlen($telefono) > 20)) {
    echo json_encode(["error_message" => "El teléfono contiene caracteres inválidos o supera los 20 caracteres."]);
    exit();
}

$email = trim($data['email'] ?? '');
if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 60)) {
    echo json_encode(["error_message" => "El email no tiene un formato válido o supera los 60 caracteres."]);
    exit();
}
$email = $email !== '' ? strtolower($conn->real_escape_string($email)) : NULL;

$observacion = limpiarTexto($data['observacion'] ?? NULL);
validarCampoTexto($observacion, "Observación", '/^[A-ZÑÁÉÍÓÚÜ0-9.\s]*$/u', 60);

$idCategorias = limpiarEntero($data['idCategoria'] ?? NULL);
$idMedios_Pago = limpiarEntero($data['idMedios_Pago'] ?? NULL);
$fechaunion = date('Y-m-d');

// VERIFICAR EXISTENCIA DE CLAVES FORÁNEAS
if ($idCategorias !== NULL) {
    $checkCategoria = $conn->prepare("SELECT idCategorias FROM categorias WHERE idCategorias = ?");
    $checkCategoria->bind_param("i", $idCategorias);
    $checkCategoria->execute();
    $checkCategoria->store_result();
    if ($checkCategoria->num_rows === 0) {
        echo json_encode(["error_message" => "El idCategoria proporcionado no existe."]);
        exit();
    }
    $checkCategoria->close();
}

if ($cond_iva !== NULL) {
    $checkIVA = $conn->prepare("SELECT id_iva FROM condicional_iva WHERE id_iva = ?");
    $checkIVA->bind_param("i", $cond_iva);
    $checkIVA->execute();
    $checkIVA->store_result();
    if ($checkIVA->num_rows === 0) {
        echo json_encode(["error_message" => "La condición de IVA seleccionada no existe."]);
        exit();
    }
    $checkIVA->close();
}

// INSERTAR EN LA BASE DE DATOS
$query = "INSERT INTO empresas (razon_social, cuit, id_iva, domicilio, domicilio_2, telefono, email, observacion, idCategorias, idMedios_Pago, fechaunion)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($query);
if (!$stmt) {
    echo json_encode(["error_message" => "Error al preparar la consulta: " . $conn->error]);
    exit();
}

$stmt->bind_param(
    "ssissssiiis",
    $razon_social,
    $cuit,
    $cond_iva,
    $domicilio,
    $domicilio_2,
    $telefono,
    $email,
    $observacion,
    $idCategorias,
    $idMedios_Pago,
    $fechaunion
);

if ($stmt->execute()) {
    echo json_encode(["success_message" => "Empresa agregada con éxito"]);
} else {
    echo json_encode(["error_message" => "Error al agregar empresa: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
