<?php
// backend/modules/socios/info_pagos_socio.php

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

include_once(__DIR__ . '/../../config/db.php');

// (solo para desarrollo; desactivar en prod)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
  // Acepta por GET o POST JSON
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
    echo json_encode(["success" => false, "message" => "Falta idSocios"]);
    exit;
  }

  // ¿Existe la tabla pagos?
  $checkPagos = $conn->query("SHOW TABLES LIKE 'pagos'");
  $tienePagos = ($checkPagos && $checkPagos->num_rows > 0);

  if (!$tienePagos) {
    echo json_encode([
      "success" => true,
      "tienePagos" => false,
      "pagosPorAnio" => new stdClass(),
      "aniosDisponibles" => [],
    ]);
    exit;
  }

  // Detectar FK: idSocios o idSocio (por compatibilidad)
  $columnaPagos = 'idSocios';
  $checkCol = $conn->query("SHOW COLUMNS FROM pagos LIKE 'idSocio'");
  if ($checkCol && $checkCol->num_rows > 0) {
    $columnaPagos = 'idSocio';
  }

  // Detectar si existe anio_aplicado (en tu DB no está, pero lo dejo compatible)
  $tieneAnioAplicado = false;
  $checkAnio = $conn->query("SHOW COLUMNS FROM pagos LIKE 'anio_aplicado'");
  if ($checkAnio && $checkAnio->num_rows > 0) {
    $tieneAnioAplicado = true;
  }

  // Año de agrupación:
  // - si existe anio_aplicado => usarlo
  // - si no => YEAR(fechaPago)
  $yearExpr = $tieneAnioAplicado
    ? "COALESCE(NULLIF(p.anio_aplicado,0), YEAR(p.fechaPago))"
    : "YEAR(p.fechaPago)";

  // Traer pagos agrupados por año (lista de idMes)
  $sql = "
    SELECT
      $yearExpr AS anio,
      GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',') AS meses
    FROM pagos p
    WHERE p.$columnaPagos = ?
      AND p.idMes IS NOT NULL
      AND $yearExpr IS NOT NULL
    GROUP BY anio
    ORDER BY anio DESC
  ";

  $stmt = $conn->prepare($sql);
  if (!$stmt) {
    throw new Exception("Error prepare: " . $conn->error);
  }

  $stmt->bind_param("i", $idSocios);
  $stmt->execute();
  $res = $stmt->get_result();

  $pagosPorAnio = [];
  $aniosDisponibles = [];

  while ($row = $res->fetch_assoc()) {
    $anio = (int)($row['anio'] ?? 0);
    if ($anio <= 0) continue;

    $aniosDisponibles[] = $anio;

    $mesesArr = [];
    if (!empty($row['meses'])) {
      foreach (explode(',', $row['meses']) as $m) {
        $m = (int)$m;
        if ($m >= 1 && $m <= 12) $mesesArr[] = $m;
      }
    }

    // únicos + orden
    $mesesArr = array_values(array_unique($mesesArr));
    sort($mesesArr);

    $pagosPorAnio[(string)$anio] = $mesesArr;
  }

  // unique + desc
  $aniosDisponibles = array_values(array_unique($aniosDisponibles));
  rsort($aniosDisponibles);

  echo json_encode([
    "success" => true,
    "tienePagos" => true,
    "pagosPorAnio" => $pagosPorAnio,
    "aniosDisponibles" => $aniosDisponibles
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => "Error al obtener pagos del socio",
    "detalle" => $e->getMessage()
  ]);
} finally {
  if (isset($conn) && $conn) $conn->close();
}