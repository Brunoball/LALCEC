<?php
// backend/modules/socios/editar_socio.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(200);
  exit();
}

include_once(__DIR__ . "/../../config/db.php");

// ✅ Forzar utf8mb4 si aplica
if (isset($conn) && $conn instanceof mysqli) {
  $conn->set_charset("utf8mb4");
}

// -------- Utilidades de respuesta ----------
function sendResponse($success, $message, $data = null) {
  $response = ["success" => $success, "message" => $message];
  if ($data !== null) $response["data"] = $data;
  echo json_encode($response, JSON_UNESCAPED_UNICODE);
  exit();
}

// -------- Leer JSON ----------
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
  sendResponse(false, "JSON inválido o vacío.");
}

// -------- Sanitización / Validación ----------
function limpiarDato($dato) {
  global $conn;
  return (isset($dato) && $dato !== "")
    ? mb_strtoupper($conn->real_escape_string($dato), "UTF-8")
    : NULL;
}

function validarCampoNombreApellido($valor, $campo) {
  if ($valor !== NULL && (!preg_match("/^[a-zA-ZñÑ\s.]+$/u", $valor) || mb_strlen($valor, "UTF-8") > 40)) {
    sendResponse(false, "El campo $campo solo puede contener letras (incluyendo ñ/Ñ), puntos y espacios, con un máximo de 40 caracteres.");
  }
}

function validarCampoDni($valor) {
  if ($valor !== NULL && (!preg_match("/^[0-9.]+$/", $valor) || strlen($valor) > 20)) {
    sendResponse(false, "El DNI solo puede contener números y puntos, con un máximo de 20 caracteres.");
  }
}

function validarCampoLocalidad($valor) {
  if ($valor !== NULL && (!preg_match("/^[a-zA-ZñÑ\s.]+$/u", $valor) || mb_strlen($valor, "UTF-8") > 40)) {
    sendResponse(false, "La localidad solo puede contener letras (incluyendo ñ/Ñ), puntos y espacios, con un máximo de 40 caracteres.");
  }
}

function validarCampoDomicilio($valor) {
  if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.]+$/u", $valor) || mb_strlen($valor, "UTF-8") > 100)) {
    sendResponse(false, "El domicilio solo puede contener letras (incluyendo ñ/Ñ), números, puntos y espacios, con un máximo de 100 caracteres.");
  }
}

function validarCampoNumerico($valor, $campo, $maxLength) {
  if ($valor !== NULL && (!preg_match("/^[0-9]+$/", $valor) || strlen($valor) > $maxLength)) {
    sendResponse(false, "El campo $campo solo puede contener números y un máximo de $maxLength caracteres.");
  }
}

function validarCampoDomicilio2($valor) {
  if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.]+$/u", $valor) || mb_strlen($valor, "UTF-8") > 255)) {
    sendResponse(false, "El domicilio de cobro solo puede contener letras (incluyendo ñ/Ñ), números, puntos y espacios, con un máximo de 255 caracteres.");
  }
}

function validarCampoObservacion($valor) {
  if ($valor !== NULL && (!preg_match("/^[a-zA-Z0-9ñÑ\s.,-]+$/u", $valor) || mb_strlen($valor, "UTF-8") > 1000)) {
    sendResponse(false, "La observación contiene caracteres inválidos o es demasiado larga.");
  }
}

function validarCampoFecha($valor) {
  if ($valor !== NULL) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) {
      sendResponse(false, "La fecha de unión debe tener el formato AAAA-MM-DD.");
    }
    [$y, $m, $d] = explode("-", $valor);
    if (!checkdate((int)$m, (int)$d, (int)$y)) {
      sendResponse(false, "La fecha de unión no es válida.");
    }
  }
}

// -------- Captura de datos ----------
$idSocios = 0;
if (isset($data["idSocios"])) $idSocios = (int)$data["idSocios"];
elseif (isset($data["id"]))  $idSocios = (int)$data["id"];

$nombre   = isset($data["nombre"])   ? limpiarDato($data["nombre"])   : NULL;
$apellido = isset($data["apellido"]) ? limpiarDato($data["apellido"]) : NULL;
$dni      = isset($data["dni"])      ? limpiarDato($data["dni"])      : NULL;

// email: minúsculas
$email = isset($data["email"]) ? trim(strtolower($data["email"])) : "";

// resto
$telefono    = isset($data["telefono"])    ? limpiarDato($data["telefono"])    : NULL;
$domicilio   = isset($data["domicilio"])   ? limpiarDato($data["domicilio"])   : NULL;
$domicilio_2 = isset($data["domicilio_2"]) ? limpiarDato($data["domicilio_2"]) : NULL;
$localidad   = isset($data["localidad"])   ? limpiarDato($data["localidad"])   : NULL;
$numero      = isset($data["numero"])      ? limpiarDato($data["numero"])      : NULL;

$idCategoria  = isset($data["categoria"]) ? (($data["categoria"] === "" || $data["categoria"] === null) ? NULL : (int)$data["categoria"]) : NULL;
$idMediosPago = isset($data["medioPago"]) ? (($data["medioPago"] === "" || $data["medioPago"] === null) ? NULL : (int)$data["medioPago"]) : NULL;

$observacion = (isset($data["observacion"]) && $data["observacion"] !== "") ? limpiarDato($data["observacion"]) : NULL;
$fechaUnion  = (isset($data["fechaUnion"]) && $data["fechaUnion"] !== "") ? $data["fechaUnion"] : NULL;

// ✅ NUEVO: enviar_recordatorio (opcional, admite NULL/0/1)
$hasEnviarRecordatorio = array_key_exists("enviar_recordatorio", $data);
$enviar_recordatorio = NULL;

if ($hasEnviarRecordatorio) {
  if ($data["enviar_recordatorio"] === null || $data["enviar_recordatorio"] === "") {
    $enviar_recordatorio = NULL;
  } else {
    $v = (int)$data["enviar_recordatorio"];
    if ($v !== 0 && $v !== 1) {
      sendResponse(false, "El campo enviar_recordatorio solo admite 0 o 1 (o NULL).");
    }
    $enviar_recordatorio = $v;
  }
}

// -------- Validaciones ----------
if ($idSocios <= 0) sendResponse(false, "Falta el ID del socio para actualizar");
if ($nombre === NULL) sendResponse(false, "El nombre es obligatorio");
if ($apellido === NULL) sendResponse(false, "El apellido es obligatorio");

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

if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  sendResponse(false, "El email ingresado no es válido.");
}

// -------- UPDATE ----------
if ($hasEnviarRecordatorio) {

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
      Fechaunion = ?,
      enviar_recordatorio = ?
    WHERE idSocios = ?
  ";

  $stmt = $conn->prepare($query);
  if ($stmt === false) sendResponse(false, "Error al preparar la consulta: " . $conn->error);

  // ✅ 15 variables -> "sssssssssiissii"
  $ok = $stmt->bind_param(
    "sssssssssiissii",
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
    $enviar_recordatorio,
    $idSocios
  );

} else {

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
  if ($stmt === false) sendResponse(false, "Error al preparar la consulta: " . $conn->error);

  // ✅ 14 variables -> "sssssssssiissi"
  $ok = $stmt->bind_param(
    "sssssssssiissi",
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
}

if ($ok === false) {
  sendResponse(false, "Error al enlazar parámetros: " . $stmt->error);
}

if ($stmt->execute()) {
  // OJO: affected_rows puede ser 0 si no cambió nada, pero igual es OK.
  sendResponse(true, "Socio actualizado correctamente");
} else {
  sendResponse(false, "Error al actualizar socio: " . $stmt->error);
}

$stmt->close();
$conn->close();
