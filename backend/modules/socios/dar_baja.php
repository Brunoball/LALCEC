<?php
// backend/modules/socios/dar_baja.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(['success' => true, 'message' => 'OK']);
  exit;
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/db.php'; // <-- ESTE db.php crea $conn (mysqli)

// Función para convertir a mayúsculas con UTF-8
function aMayus($texto) {
  return isset($texto) && trim($texto) !== '' 
    ? mb_strtoupper(trim($texto), 'UTF-8') 
    : '';
}

try {
  // Validar método
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Usar POST.']);
    exit;
  }

  // Validar conexión mysqli
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception('No se encontró la conexión $conn (MySQLi).');
  }

  // Leer body
  $raw = file_get_contents('php://input');
  if ($raw === false) {
    throw new Exception('No se pudo leer el body.');
  }
  $data = json_decode($raw, true);
  if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Body inválido. Enviar JSON.']);
    exit;
  }

  // Inputs
  $idSocio = isset($data['idSocio']) ? (int)$data['idSocio'] : 0;
  $motivo  = isset($data['motivo']) ? aMayus($data['motivo']) : '';

  if ($idSocio <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'idSocio es requerido y debe ser > 0.']);
    exit;
  }
  if ($motivo === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El motivo es obligatorio.']);
    exit;
  }

  // 1) Verificar existencia
  $sqlSel = "SELECT idSocios, activo FROM socios WHERE idSocios = ? LIMIT 1";
  $stmtSel = $conn->prepare($sqlSel);
  if (!$stmtSel) {
    throw new Exception("Error preparando SELECT: " . $conn->error);
  }
  $stmtSel->bind_param("i", $idSocio);
  $stmtSel->execute();
  $res = $stmtSel->get_result();
  $row = $res ? $res->fetch_assoc() : null;
  $stmtSel->close();

  if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'El socio no existe.']);
    exit;
  }

  // 2) Si ya estaba inactivo, solo actualizar motivo
  if ((int)$row['activo'] === 0) {
    $sqlUpdMot = "UPDATE socios SET motivo = ? WHERE idSocios = ?";
    $stmtUpdMot = $conn->prepare($sqlUpdMot);
    if (!$stmtUpdMot) {
      throw new Exception("Error preparando UPDATE motivo: " . $conn->error);
    }
    $stmtUpdMot->bind_param("si", $motivo, $idSocio);
    $okMot = $stmtUpdMot->execute();
    $rowsMot = $stmtUpdMot->affected_rows;
    $stmtUpdMot->close();

    echo json_encode([
      'success' => (bool)$okMot,
      'message' => $okMot ? 'El socio ya estaba dado de baja. Motivo actualizado.' : 'No se pudo actualizar el motivo.',
      'rowsAffected' => $rowsMot
    ]);
    exit;
  }

  // 3) Dar de baja y guardar motivo
  $sqlUpd = "UPDATE socios SET activo = 0, motivo = ? WHERE idSocios = ?";
  $stmtUpd = $conn->prepare($sqlUpd);
  if (!$stmtUpd) {
    throw new Exception("Error preparando UPDATE baja: " . $conn->error);
  }
  $stmtUpd->bind_param("si", $motivo, $idSocio);
  $ok = $stmtUpd->execute();
  $rows = $stmtUpd->affected_rows;
  $stmtUpd->close();

  echo json_encode([
    'success' => (bool)$ok,
    'message' => $ok ? 'Socio dado de baja correctamente.' : 'No se pudo dar de baja al socio.',
    'rowsAffected' => $rows
  ]);
  exit;

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'message' => 'Error en el servidor al dar de baja.',
    'error'   => $e->getMessage(),
    'line'    => $e->getLine(),
    'file'    => $e->getFile()
  ]);
  exit;
}
