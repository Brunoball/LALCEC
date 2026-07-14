<?php
// backend/modules/socios/info_pagos_socio.php

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

include_once(__DIR__ . '/../../config/db.php');

// (solo para desarrollo; desactivar en prod)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

date_default_timezone_set('America/Argentina/Buenos_Aires');

function normalizarPagosPorAnioInfo($pagosPorAnio) {
  $normalizado = [];
  if (!is_array($pagosPorAnio)) return $normalizado;

  foreach ($pagosPorAnio as $anio => $meses) {
    $anioInt = (int)$anio;
    if ($anioInt <= 0) continue;
    if (!isset($normalizado[(string)$anioInt])) $normalizado[(string)$anioInt] = [];

    if (!is_array($meses)) continue;

    foreach ($meses as $mes) {
      $mesInt = (int)$mes;
      if ($mesInt >= 1 && $mesInt <= 12 && !in_array($mesInt, $normalizado[(string)$anioInt], true)) {
        $normalizado[(string)$anioInt][] = $mesInt;
      }
    }

    sort($normalizado[(string)$anioInt], SORT_NUMERIC);
  }

  krsort($normalizado, SORT_NUMERIC);
  return $normalizado;
}

function armarAniosDisponibles($fechaUnion, $pagosPorAnio) {
  $anioActual = (int)date('Y');
  $anios = [];

  $anioUnion = $anioActual;
  if (!empty($fechaUnion)) {
    try {
      $dt = new DateTime($fechaUnion, new DateTimeZone('America/Argentina/Buenos_Aires'));
      $anioUnion = (int)$dt->format('Y');
    } catch (Throwable $e) {
      $anioUnion = $anioActual;
    }
  }

  // Siempre mostrar desde el año de alta hasta el año actual, aunque ese año no tenga pagos.
  $desde = min($anioUnion, $anioActual);
  $hasta = max($anioUnion, $anioActual);
  for ($a = $desde; $a <= $hasta; $a++) {
    $anios[$a] = true;
  }

  // También incluir cualquier año con pagos históricos por compatibilidad.
  foreach (array_keys($pagosPorAnio) as $anioPago) {
    $a = (int)$anioPago;
    if ($a > 0) $anios[$a] = true;
  }

  $lista = array_map('intval', array_keys($anios));
  rsort($lista, SORT_NUMERIC);
  return $lista;
}

try {
  $conn->set_charset('utf8mb4');

  $idSocios = null;

  if (isset($_GET['idSocios'])) {
    $idSocios = (int)$_GET['idSocios'];
  } else {
    $raw = file_get_contents("php://input");
    $json = json_decode($raw, true);
    if (is_array($json) && isset($json['idSocios'])) {
      $idSocios = (int)$json['idSocios'];
    }
  }

  if (!$idSocios || $idSocios <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Falta idSocios"], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $fechaUnion = null;
  $stmtSocio = $conn->prepare("SELECT Fechaunion FROM socios WHERE idSocios = ? LIMIT 1");
  if (!$stmtSocio) throw new Exception("Error prepare socio: " . $conn->error);
  $stmtSocio->bind_param("i", $idSocios);
  $stmtSocio->execute();
  $resSocio = $stmtSocio->get_result();
  if ($rowSocio = $resSocio->fetch_assoc()) {
    $fechaUnion = $rowSocio['Fechaunion'] ?? null;
  }
  $stmtSocio->close();

  $checkPagos = $conn->query("SHOW TABLES LIKE 'pagos'");
  $tienePagos = ($checkPagos && $checkPagos->num_rows > 0);

  if (!$tienePagos) {
    $aniosDisponibles = armarAniosDisponibles($fechaUnion, []);
    $pagosPorAnio = [];
    foreach ($aniosDisponibles as $anio) $pagosPorAnio[(string)$anio] = [];

    echo json_encode([
      "success" => true,
      "tienePagos" => false,
      "fechaUnion" => $fechaUnion,
      "currentYear" => (int)date('Y'),
      "pagosPorAnio" => $pagosPorAnio,
      "aniosDisponibles" => $aniosDisponibles,
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // Detectar FK: idSocios o idSocio (por compatibilidad)
  $columnaPagos = 'idSocios';
  $checkCol = $conn->query("SHOW COLUMNS FROM pagos LIKE 'idSocio'");
  if ($checkCol && $checkCol->num_rows > 0) {
    $columnaPagos = 'idSocio';
  }

  // Detectar si existe anio_aplicado. Si no existe, se usa YEAR(fechaPago).
  $tieneAnioAplicado = false;
  $checkAnio = $conn->query("SHOW COLUMNS FROM pagos LIKE 'anio_aplicado'");
  if ($checkAnio && $checkAnio->num_rows > 0) {
    $tieneAnioAplicado = true;
  }

  $yearExpr = $tieneAnioAplicado
    ? "COALESCE(NULLIF(p.anio_aplicado,0), YEAR(p.fechaPago))"
    : "YEAR(p.fechaPago)";

  $sql = "
    SELECT
      $yearExpr AS anio,
      p.idMes AS idMes
    FROM pagos p
    WHERE p.$columnaPagos = ?
      AND p.idMes IS NOT NULL
      AND p.idMes BETWEEN 1 AND 12
      AND $yearExpr IS NOT NULL
    ORDER BY anio DESC, p.idMes ASC
  ";

  $stmt = $conn->prepare($sql);
  if (!$stmt) {
    throw new Exception("Error prepare pagos: " . $conn->error);
  }

  $stmt->bind_param("i", $idSocios);
  $stmt->execute();
  $res = $stmt->get_result();

  $pagosPorAnio = [];

  while ($row = $res->fetch_assoc()) {
    $anio = (int)($row['anio'] ?? 0);
    $mes = (int)($row['idMes'] ?? 0);
    if ($anio <= 0 || $mes < 1 || $mes > 12) continue;

    if (!isset($pagosPorAnio[(string)$anio])) $pagosPorAnio[(string)$anio] = [];
    if (!in_array($mes, $pagosPorAnio[(string)$anio], true)) {
      $pagosPorAnio[(string)$anio][] = $mes;
    }
  }
  $stmt->close();

  $pagosPorAnio = normalizarPagosPorAnioInfo($pagosPorAnio);
  $aniosDisponibles = armarAniosDisponibles($fechaUnion, $pagosPorAnio);

  // Clave del arreglo: incluir años sin pagos, para que el modal muestre 2026 aunque no tenga registros.
  foreach ($aniosDisponibles as $anio) {
    if (!isset($pagosPorAnio[(string)$anio])) $pagosPorAnio[(string)$anio] = [];
  }
  krsort($pagosPorAnio, SORT_NUMERIC);

  echo json_encode([
    "success" => true,
    "tienePagos" => true,
    "fechaUnion" => $fechaUnion,
    "currentYear" => (int)date('Y'),
    "pagosPorAnio" => $pagosPorAnio,
    "aniosDisponibles" => $aniosDisponibles
  ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => "Error al obtener pagos del socio",
    "detalle" => $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
} finally {
  if (isset($conn) && $conn) $conn->close();
}
