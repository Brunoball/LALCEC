<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../../config/db.php"; // $conn (mysqli)

$idEmp = isset($_GET["idEmp"]) ? (int)$_GET["idEmp"] : 0;

if ($idEmp <= 0) {
  echo json_encode([
    "success" => false,
    "message" => "idEmp inválido",
  ]);
  exit;
}

$MESES = [
  1 => "ENERO", 2 => "FEBRERO", 3 => "MARZO", 4 => "ABRIL",
  5 => "MAYO",  6 => "JUNIO",   7 => "JULIO",  8 => "AGOSTO",
  9 => "SEPTIEMBRE", 10 => "OCTUBRE", 11 => "NOVIEMBRE", 12 => "DICIEMBRE",
];

function parseYearFromFecha($fechaPago): int {
  if (!$fechaPago) return 0;
  if (preg_match('/^\d{4}-\d{2}-\d{2}/', $fechaPago)) {
    return (int)substr($fechaPago, 0, 4);
  }
  if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $fechaPago)) {
    $dt = DateTime::createFromFormat("d/m/Y", $fechaPago);
    return $dt ? (int)$dt->format("Y") : 0;
  }
  $ts = strtotime($fechaPago);
  return $ts ? (int)date("Y", $ts) : 0;
}

try {
  // ── Verificar que $conn es válido ──────────────────────────────────────────
  if (!isset($conn) || $conn->connect_error) {
    throw new Exception("Sin conexión a la base de datos");
  }

  $tabla = "pagos_empresas";

  // ── Verificar que la tabla existe ──────────────────────────────────────────
  $resTabla = $conn->query("SHOW TABLES LIKE '{$tabla}'");
  if (!$resTabla || $resTabla->num_rows === 0) {
    echo json_encode([
      "success" => false,
      "message" => "No se encontró la tabla {$tabla}",
    ]);
    exit;
  }

  // ── Verificar si existe la columna anio_aplicado ───────────────────────────
  $tieneAnioAplicado = false;
  $resCols = $conn->query("SHOW COLUMNS FROM `{$tabla}` LIKE 'anio_aplicado'");
  if ($resCols && $resCols->num_rows > 0) {
    $tieneAnioAplicado = true;
  }

  // ── Consulta principal ─────────────────────────────────────────────────────
  if ($tieneAnioAplicado) {
    $sql = "SELECT idMes, fechaPago, anio_aplicado
            FROM `{$tabla}`
            WHERE idEmp = ?
            ORDER BY fechaPago ASC";
  } else {
    $sql = "SELECT idMes, fechaPago
            FROM `{$tabla}`
            WHERE idEmp = ?
            ORDER BY fechaPago ASC";
  }

  $stmt = $conn->prepare($sql);
  if (!$stmt) {
    throw new Exception("Error al preparar consulta: " . $conn->error);
  }

  $stmt->bind_param("i", $idEmp);
  $stmt->execute();
  $result = $stmt->get_result();

  $porAnio = [];

  while ($r = $result->fetch_assoc()) {
    $idMes = isset($r["idMes"]) ? (int)$r["idMes"] : 0;
    if ($idMes < 1 || $idMes > 12) continue;

    $anioPeriodo = 0;

    if ($tieneAnioAplicado) {
      $anioPeriodo = (int)($r["anio_aplicado"] ?? 0);
    }

    if ($anioPeriodo <= 0) {
      $anioPeriodo = parseYearFromFecha($r["fechaPago"] ?? null);
    }

    if ($anioPeriodo <= 0) continue;

    $mesTxt = $MESES[$idMes] ?? null;
    if (!$mesTxt) continue;

    $key = (string)$anioPeriodo;
    if (!isset($porAnio[$key])) $porAnio[$key] = [];
    $porAnio[$key][] = $mesTxt;
  }

  $stmt->close();

  // ── Dedup + ordenar por calendario ────────────────────────────────────────
  $orden = array_flip(array_values($MESES)); // "ENERO"=>0, "FEBRERO"=>1 ...
  foreach ($porAnio as $anio => $arr) {
    $arr = array_values(array_unique(array_map(fn($m) => strtoupper(trim($m)), $arr)));
    usort($arr, function($a, $b) use ($orden) {
      return ($orden[$a] ?? 999) <=> ($orden[$b] ?? 999);
    });
    $porAnio[$anio] = $arr;
  }

  $aniosDisponibles = array_map("intval", array_keys($porAnio));
  rsort($aniosDisponibles);

  echo json_encode([
    "success"          => true,
    "idEmp"            => $idEmp,
    "usaAnioAplicado"  => $tieneAnioAplicado,
    "pagosPorAnio"     => $porAnio,        // { "2026":["ENERO"], "2027":["FEBRERO"] }
    "aniosDisponibles" => $aniosDisponibles,
  ]);

} catch (Throwable $e) {
  echo json_encode([
    "success" => false,
    "message" => "Error al obtener pagos por año",
    "error"   => $e->getMessage(),
  ]);
}