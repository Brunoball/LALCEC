<?php
// backend/modules/socios/agregarsocios.php

header("Content-Type: application/json; charset=utf-8");
include_once(__DIR__ . '/../../config/db.php');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  echo json_encode(["error_message" => "Método no permitido. Se esperaba POST"]);
  exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!$data || !is_array($data)) {
  echo json_encode(["error_message" => "No se recibieron datos válidos"]);
  exit;
}

// Helpers
function toUpperOrNull($v) {
  $v = isset($v) ? trim($v) : '';
  return $v === '' ? null : mb_strtoupper($v, 'UTF-8');
}
function orNull($v) {
  $v = isset($v) ? trim($v) : '';
  return $v === '' ? null : $v;
}

// Tomar datos
$apellido      = toUpperOrNull($data['apellido'] ?? '');
$nombre        = toUpperOrNull($data['nombre'] ?? '');
$dni           = orNull($data['dni'] ?? '');
$email         = isset($data['email']) ? trim(strtolower($data['email'])) : '';
$telefono      = orNull($data['telefono'] ?? '');
$domicilio     = toUpperOrNull($data['domicilio'] ?? '');
$domicilio_2   = toUpperOrNull($data['domicilio_2'] ?? '');
$localidad     = toUpperOrNull($data['localidad'] ?? '');
$numero        = orNull($data['numero'] ?? '');
$idCategoria   = orNull($data['idCategoria'] ?? '');
$idMedios_Pago = orNull($data['idMedios_Pago'] ?? '');
$observacion   = toUpperOrNull($data['observacion'] ?? '');
$fecha_union   = date("Y-m-d");

// ✅ NUEVO: enviar_recordatorio
// - si no viene -> 0
// - si viene null/"" -> 0 (para alta)
$enviar_recordatorio = 0;
if (array_key_exists('enviar_recordatorio', $data)) {
  if ($data['enviar_recordatorio'] === null || $data['enviar_recordatorio'] === '') {
    $enviar_recordatorio = 0;
  } else {
    $v = (int)$data['enviar_recordatorio'];
    if ($v !== 0 && $v !== 1) {
      echo json_encode(["error_message" => "enviar_recordatorio inválido. Solo 0 o 1."]);
      exit;
    }
    $enviar_recordatorio = $v;
  }
}

// ===== Validaciones =====
function validarNombreLike($valor, $campo) {
  if ($valor === null) {
    echo json_encode(["error_message" => "El $campo es obligatorio"]);
    exit;
  }
  if (!preg_match("/^[\p{L}\s.]+$/u", $valor) || mb_strlen($valor, 'UTF-8') > 50) {
    echo json_encode(["error_message" => "$campo solo puede contener letras (incluye acentos/Ñ), espacios y puntos. Máximo 50 caracteres."]);
    exit;
  }
}
validarNombreLike($apellido, "Apellido");
validarNombreLike($nombre, "Nombre");

// DNI
if ($dni !== null && (!preg_match("/^[0-9.]+$/", $dni) || strlen($dni) > 20)) {
  echo json_encode(["error_message" => "El DNI solo puede contener números y puntos (máx. 20)."]);
  exit;
}

// Localidad
if ($localidad !== null && (!preg_match("/^[\p{L}\s.]+$/u", $localidad) || mb_strlen($localidad, 'UTF-8') > 50)) {
  echo json_encode(["error_message" => "La localidad solo puede contener letras (incluye acentos/Ñ), puntos y espacios. Máximo 50 caracteres."]);
  exit;
}

// Domicilio
if ($domicilio !== null && (!preg_match("/^[\p{L}\p{N}\s.,-]+$/u", $domicilio) || mb_strlen($domicilio, 'UTF-8') > 100)) {
  echo json_encode(["error_message" => "El domicilio admite letras/números, espacios y . , - (máx. 100)."]);
  exit;
}

// Número
if ($numero !== null && (!preg_match("/^[0-9]+$/", $numero) || strlen($numero) > 10)) {
  echo json_encode(["error_message" => "El campo Número solo admite dígitos (máx. 10)."]);
  exit;
}

// Teléfono
if ($telefono !== null && (!preg_match("/^[0-9\-]+$/", $telefono) || strlen($telefono) > 15)) {
  echo json_encode(["error_message" => "El teléfono solo admite números y guiones (máx. 15)."]);
  exit;
}

// Domicilio_2
if ($domicilio_2 !== null && (!preg_match("/^[\p{L}\p{N}\s.,-]+$/u", $domicilio_2) || mb_strlen($domicilio_2, 'UTF-8') > 255)) {
  echo json_encode(["error_message" => "El Domicilio de Cobro admite letras/números, espacios y . , - (máx. 255)."]);
  exit;
}

// Observación
if ($observacion !== null && mb_strlen($observacion, 'UTF-8') > 255) {
  echo json_encode(["error_message" => "La observación no puede superar 255 caracteres."]);
  exit;
}

// Email (mantengo tu regla .com)
if ($email !== '' && (strlen($email) > 100 || !preg_match("/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i", $email))) {
  echo json_encode(["error_message" => "El email debe ser válido, terminar en .com y no superar 100 caracteres."]);
  exit;
}

// idCategoria / idMedios_Pago
if ($idCategoria !== null && !preg_match("/^[0-9]+$/", $idCategoria)) {
  echo json_encode(["error_message" => "idCategoria inválido."]);
  exit;
}
if ($idMedios_Pago !== null && !preg_match("/^[0-9]+$/", $idMedios_Pago)) {
  echo json_encode(["error_message" => "idMedios_Pago inválido."]);
  exit;
}

// ===== INSERT =====
// ✅ agrega enviar_recordatorio
$query = "INSERT INTO `socios`
  (`Apellido`, `Nombre`, `DNI`, `Email`, `Telefono`, `Domicilio`, `Domicilio_2`,
   `Localidad`, `Numero`, `idCategoria`, `idMedios_Pago`, `Observacion`, `Fechaunion`, `activo`, `enviar_recordatorio`)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)";

$stmt = $conn->prepare($query);
if (!$stmt) {
  echo json_encode(["error_message" => "Error al preparar sentencia: " . $conn->error]);
  exit;
}

// 14 params
$stmt->bind_param(
  "sssssssssssssi",
  $apellido,      // 1
  $nombre,        // 2
  $dni,           // 3
  $email,         // 4
  $telefono,      // 5
  $domicilio,     // 6
  $domicilio_2,   // 7
  $localidad,     // 8
  $numero,        // 9
  $idCategoria,   // 10
  $idMedios_Pago, // 11
  $observacion,   // 12
  $fecha_union,   // 13
  $enviar_recordatorio // 14 (int)
);

if ($stmt->execute()) {
  echo json_encode(["success_message" => "Socio agregado con éxito"]);
} else {
  echo json_encode(["error_message" => "Error al agregar socio: " . $stmt->error . " (Código: " . $conn->errno . ")"]);
}

$stmt->close();
$conn->close();
