<?php
// backend/modules/empresas/agregar_empresa.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(["ok" => true], JSON_UNESCAPED_UNICODE);
  exit;
}

require_once(__DIR__ . '/../../config/db.php'); // define $conn (mysqli)

// ✅ FORZAR UTF8MB4 PARA Ñ / ACENTOS
$conn->set_charset("utf8mb4");

// ✅ Para que los errores de MySQL se puedan atrapar y no salgan como HTML
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function errorYSalir($msg, $code = 400) {
  http_response_code($code);
  echo json_encode(["error_message" => $msg], JSON_UNESCAPED_UNICODE);
  exit();
}

try {

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorYSalir("Método no permitido. Se esperaba POST", 405);
  }

  $data = json_decode(file_get_contents("php://input"), true);
  if (!is_array($data)) {
    errorYSalir("No se recibieron datos válidos (JSON inválido).");
  }

  /* =========================
     Helpers de limpieza/validación
  ========================= */
  function limpiarTexto($dato, $maxLen = null) {
    global $conn;
    if (!isset($dato)) return NULL;

    $v = trim((string)$dato);
    if ($v === '') return NULL;

    if ($maxLen !== null && mb_strlen($v, 'UTF-8') > $maxLen) return NULL;

    // ✅ MAYÚSCULAS UTF-8 (Ñ incluida)
    $v = mb_strtoupper($v, 'UTF-8');

    return $conn->real_escape_string($v);
  }

  function limpiarEntero($dato) {
    if (!isset($dato) || $dato === '' || $dato === null) return NULL;
    if (!is_numeric($dato)) return NULL;
    return (int)$dato;
  }

  function validarRegexOpcional($valor, $regex, $maxLen = null) {
    if ($valor === NULL) return true;
    if ($maxLen !== null && mb_strlen($valor, 'UTF-8') > $maxLen) return false;
    return (bool) preg_match($regex, $valor);
  }

  /* =========================
     Campos requeridos
  ========================= */
  $razon_social = limpiarTexto($data['razon_social'] ?? '', 80);
  if (!$razon_social) {
    errorYSalir("La Razón Social es obligatoria.");
  }

  // CUIT/CUIL: aceptar 11 dígitos o XX-XXXXXXXX-X
  $cuitRaw = trim((string)($data['cuit'] ?? ''));
  if ($cuitRaw === '') {
    errorYSalir("El CUIL/CUIT es obligatorio.");
  }

  $soloDigitos = preg_replace('/\D+/', '', $cuitRaw);

  if (!(preg_match('/^\d{2}-\d{8}-\d{1}$/', $cuitRaw) || preg_match('/^\d{11}$/', $soloDigitos))) {
    errorYSalir("El CUIL/CUIT debe ser 11 dígitos o con formato XX-XXXXXXXX-X.");
  }

  // ✅ si querés mantener exactamente lo mismo, lo dejamos tal cual
  $cuit = $conn->real_escape_string($cuitRaw);

  /* =========================
     Campos opcionales pero estrictos
  ========================= */
  $cond_iva = limpiarEntero($data['cond_iva'] ?? NULL);

  $domicilio = limpiarTexto($data['domicilio'] ?? NULL, 40);
  if (!validarRegexOpcional($domicilio, '/^[A-ZÑÁÉÍÓÚÜ0-9.\s]+$/u', 40)) {
    errorYSalir("Domicilio inválido (solo letras, números, puntos y espacios; máx. 40).");
  }

  $domicilio_2 = limpiarTexto($data['domicilio_2'] ?? NULL, 40);
  if (!validarRegexOpcional($domicilio_2, '/^[A-ZÑÁÉÍÓÚÜ0-9.\s]+$/u', 40)) {
    errorYSalir("Domicilio de cobro inválido (solo letras, números, puntos y espacios; máx. 40).");
  }

  $telefonoRaw = trim((string)($data['telefono'] ?? ''));
  $telefono = ($telefonoRaw === '') ? NULL : $conn->real_escape_string($telefonoRaw);
  if ($telefono !== NULL && (!preg_match('/^[0-9+\-\s()]*$/', $telefonoRaw) || strlen($telefonoRaw) > 20)) {
    errorYSalir("El teléfono contiene caracteres inválidos o supera los 20 caracteres.");
  }

  $emailRaw = trim((string)($data['email'] ?? ''));
  $email = ($emailRaw === '') ? NULL : mb_strtolower($conn->real_escape_string($emailRaw), 'UTF-8');
  if ($email !== NULL && (!filter_var($emailRaw, FILTER_VALIDATE_EMAIL) || strlen($emailRaw) > 60)) {
    errorYSalir("El email no tiene un formato válido o supera los 60 caracteres.");
  }

  $observacion = limpiarTexto($data['observacion'] ?? NULL, 60);
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
    $checkCategoria = $conn->prepare("SELECT 1 FROM categorias WHERE idCategorias = ? LIMIT 1");
    $checkCategoria->bind_param("i", $idCategorias);
    $checkCategoria->execute();
    $checkCategoria->store_result();
    if ($checkCategoria->num_rows === 0) {
      $checkCategoria->close();
      errorYSalir("El idCategoria proporcionado no existe.");
    }
    $checkCategoria->close();
  }

  if ($cond_iva !== NULL) {
    $checkIVA = $conn->prepare("SELECT 1 FROM condicional_iva WHERE id_iva = ? LIMIT 1");
    $checkIVA->bind_param("i", $cond_iva);
    $checkIVA->execute();
    $checkIVA->store_result();
    if ($checkIVA->num_rows === 0) {
      $checkIVA->close();
      errorYSalir("La condición de IVA seleccionada no existe.");
    }
    $checkIVA->close();
  }

  // ✅ tu tabla es mediospago y el campo es idMedios_Pago
  if ($idMedios_Pago !== NULL) {
    $checkMP = $conn->prepare("SELECT 1 FROM mediospago WHERE idMedios_Pago = ? LIMIT 1");
    $checkMP->bind_param("i", $idMedios_Pago);
    $checkMP->execute();
    $checkMP->store_result();
    if ($checkMP->num_rows === 0) {
      $checkMP->close();
      errorYSalir("El medio de pago seleccionado no existe.");
    }
    $checkMP->close();
  }

  /* =========================
     Verificar CUIT duplicado (normalizado)
  ========================= */
  $checkDup = $conn->prepare("
      SELECT idEmp
      FROM empresas
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(cuit,'-',''),'.',''),' ',''),'/','') = ?
      LIMIT 1
  ");
  $checkDup->bind_param("s", $soloDigitos);
  $checkDup->execute();
  $checkDup->store_result();
  if ($checkDup->num_rows > 0) {
    $checkDup->close();
    errorYSalir("Ya existe una empresa registrada con ese CUIT/CUIL.", 409);
  }
  $checkDup->close();

  /* =========================
     Insertar
  ========================= */
  $query = "INSERT INTO empresas (
      razon_social, cuit, id_iva, domicilio, domicilio_2, telefono, email, observacion, idCategorias, idMedios_Pago, fechaunion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  $stmt = $conn->prepare($query);

  $stmt->bind_param(
    "ssisssssiis",
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

  $stmt->execute();
  $stmt->close();
  $conn->close();

  echo json_encode(["success_message" => "Empresa agregada con éxito"], JSON_UNESCAPED_UNICODE);

} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(["error_message" => "Error DB: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
  exit;
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["error_message" => "Error interno: " . $e->getMessage()], JSON_UNESCAPED_UNICODE);
  exit;
}
