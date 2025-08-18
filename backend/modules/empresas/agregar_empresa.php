<?php
// backend/modules/empresas/agregar_empresa.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

require_once(__DIR__ . '/../../config/db.php');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["error_message" => "Método no permitido. Se esperaba POST"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    echo json_encode(["error_message" => "No se recibieron datos válidos"]);
    exit();
}

/* =========================
   Helpers de limpieza/validación
========================= */
function limpiarTexto($dato) {
    global $conn;
    return isset($dato) && trim($dato) !== '' ? mb_strtoupper($conn->real_escape_string(trim($dato)), 'UTF-8') : NULL;
}

function limpiarEntero($dato) {
    return (isset($dato) && $dato !== '' && is_numeric($dato)) ? (int)$dato : NULL;
}

function validarRegexOpcional($valor, $regex, $maxLen = null) {
    if ($valor === NULL) return true;
    if ($maxLen !== null && mb_strlen($valor, 'UTF-8') > $maxLen) return false;
    return (bool) preg_match($regex, $valor);
}

function errorYSalir($msg) {
    echo json_encode(["error_message" => $msg]);
    exit();
}

/* =========================
   Campos requeridos
========================= */
$razon_social = limpiarTexto($data['razon_social'] ?? '');
if (!$razon_social) {
    errorYSalir("La Razón Social es obligatoria.");
}

// CUIT/CUIL: aceptar 11 dígitos o XX-XXXXXXXX-X
$cuitRaw = trim($data['cuit'] ?? '');
if ($cuitRaw === '') {
    errorYSalir("El CUIL/CUIT es obligatorio.");
}
$soloDigitos = preg_replace('/[^0-9]/', '', $cuitRaw);
if (!(preg_match('/^\d{2}-\d{8}-\d{1}$/', $cuitRaw) || preg_match('/^\d{11}$/', $soloDigitos))) {
    errorYSalir("El CUIL/CUIT debe ser 11 dígitos o con formato XX-XXXXXXXX-X.");
}
$cuit = strtoupper($conn->real_escape_string($cuitRaw));

/* =========================
   Campos opcionales pero estrictos
========================= */
$cond_iva    = limpiarEntero($data['cond_iva'] ?? NULL);

$domicilio   = limpiarTexto($data['domicilio'] ?? NULL);
if (!validarRegexOpcional($domicilio, '/^[A-ZÑÁÉÍÓÚÜ0-9.\s]+$/u', 40)) {
    errorYSalir("Domicilio inválido (solo letras, números, puntos y espacios; máx. 40).");
}

$domicilio_2 = limpiarTexto($data['domicilio_2'] ?? NULL);
if (!validarRegexOpcional($domicilio_2, '/^[A-ZÑÁÉÍÓÚÜ0-9.\s]+$/u', 40)) {
    errorYSalir("Domicilio Alternativo inválido (solo letras, números, puntos y espacios; máx. 40).");
}

$telefonoRaw = trim($data['telefono'] ?? '');
$telefono = ($telefonoRaw === '') ? NULL : mb_strtoupper($conn->real_escape_string($telefonoRaw), 'UTF-8');
if ($telefono !== NULL && (!preg_match('/^[0-9+\-\s()]*$/', $telefono) || strlen($telefono) > 20)) {
    errorYSalir("El teléfono contiene caracteres inválidos o supera los 20 caracteres.");
}

$emailRaw = trim($data['email'] ?? '');
$email = ($emailRaw === '') ? NULL : strtolower($conn->real_escape_string($emailRaw));
if ($email !== NULL && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 60)) {
    errorYSalir("El email no tiene un formato válido o supera los 60 caracteres.");
}

$observacion = limpiarTexto($data['observacion'] ?? NULL);
if (!validarRegexOpcional($observacion, '/^[A-ZÑÁÉÍÓÚÜ0-9.\s]*$/u', 60)) {
    errorYSalir("Observación inválida (solo letras, números, puntos y espacios; máx. 60).");
}

$idCategorias  = limpiarEntero($data['idCategoria'] ?? NULL);
$idMedios_Pago = limpiarEntero($data['idMedios_Pago'] ?? NULL);
$fechaunion    = date('Y-m-d');

/* =========================
   Verificar claves foráneas SOLO si se envían
========================= */
if ($idCategorias !== NULL) {
    $checkCategoria = $conn->prepare("SELECT idCategorias FROM categorias WHERE idCategorias = ?");
    $checkCategoria->bind_param("i", $idCategorias);
    $checkCategoria->execute();
    $checkCategoria->store_result();
    if ($checkCategoria->num_rows === 0) {
        errorYSalir("El idCategoria proporcionado no existe.");
    }
    $checkCategoria->close();
}

if ($cond_iva !== NULL) {
    $checkIVA = $conn->prepare("SELECT id_iva FROM condicional_iva WHERE id_iva = ?");
    $checkIVA->bind_param("i", $cond_iva);
    $checkIVA->execute();
    $checkIVA->store_result();
    if ($checkIVA->num_rows === 0) {
        errorYSalir("La condición de IVA seleccionada no existe.");
    }
    $checkIVA->close();
}

if ($idMedios_Pago !== NULL) {
    $checkMP = $conn->prepare("SELECT IdMedios_pago FROM medios_pago WHERE IdMedios_pago = ?");
    if ($checkMP) {
        $checkMP->bind_param("i", $idMedios_Pago);
        $checkMP->execute();
        $checkMP->store_result();
        if ($checkMP->num_rows === 0) {
            errorYSalir("El medio de pago seleccionado no existe.");
        }
        $checkMP->close();
    }
}

/* =========================
   Verificar CUIT duplicado (normalizado)
   - Compara eliminando -, ., espacios y /
========================= */
$checkDup = $conn->prepare("
    SELECT idEmp
    FROM empresas
    WHERE REPLACE(REPLACE(REPLACE(REPLACE(cuit,'-',''),'.',''),' ',''),'/','') = ?
    LIMIT 1
");
if ($checkDup) {
    $checkDup->bind_param("s", $soloDigitos);
    $checkDup->execute();
    $checkDup->store_result();
    if ($checkDup->num_rows > 0) {
        $checkDup->close();
        errorYSalir("Ya existe una empresa registrada con ese CUIT/CUIL.");
    }
    $checkDup->close();
} else {
    // Si fallara el prepare por alguna razón
    errorYSalir("No se pudo validar duplicados de CUIT: " . $conn->error);
}

/* =========================
   Insertar
========================= */
$query = "INSERT INTO empresas (
            razon_social, cuit, id_iva, domicilio, domicilio_2, telefono, email, observacion, idCategorias, idMedios_Pago, fechaunion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

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
    // Si en tu DB hay un índice único por CUIT, podría dispararse aquí:
    if ($stmt->errno === 1062) {
        echo json_encode(["error_message" => "Ya existe una empresa registrada con ese CUIT/CUIL."]);
    } else {
        echo json_encode(["error_message" => "Error al agregar empresa: " . $stmt->error]);
    }
}

$stmt->close();
$conn->close();
