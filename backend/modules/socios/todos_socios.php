<?php
// modules/socios/todos_socios.php

// CORS + JSON
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
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

$nombresMesesArray = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

function obtenerCategoriasYMediosPago($conn) {
    $categorias = [];
    if ($res = $conn->query("SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias")) {
        while ($row = $res->fetch_assoc()) $categorias[] = $row;
    }

    $mediosPago = [];
    if ($res = $conn->query("SELECT IdMedios_pago, Medio_Pago FROM mediospago")) {
        while ($row = $res->fetch_assoc()) $mediosPago[] = $row;
    }

    return ["categorias" => $categorias, "mediosPago" => $mediosPago];
}

function parseFechaUnionSocio($fecha) {
    if (empty($fecha)) return null;
    try {
        return new DateTime($fecha, new DateTimeZone('America/Argentina/Buenos_Aires'));
    } catch (Throwable $e) {
        return null;
    }
}

function normalizarPagosPorAnio($pagosPorAnio) {
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

function calcularEstadoPagoSocio($fechaUnion, $pagosPorAnio, $nombresMesesArray) {
    $hoy = new DateTime('now', new DateTimeZone('America/Argentina/Buenos_Aires'));
    $anioActual = (int)$hoy->format('Y');
    $mesActual  = (int)$hoy->format('n');

    $alta = parseFechaUnionSocio($fechaUnion);

    // Si no hay fecha válida, se exige solo el año actual hasta el mes actual.
    $anioUnion = $alta ? (int)$alta->format('Y') : $anioActual;
    $mesUnion  = $alta ? (int)$alta->format('n') : 1;

    // Si la fecha de alta está en el futuro, no debe figurar atrasado todavía.
    if ($anioUnion > $anioActual || ($anioUnion === $anioActual && $mesUnion > $mesActual)) {
        return [
            'estado' => 'verde',
            'deuda_meses' => 0,
            'meses_esperados' => [],
            'meses_impagos' => []
        ];
    }

    $pagosPorAnio = normalizarPagosPorAnio($pagosPorAnio);

    $deuda = 0;
    $mesesEsperados = [];
    $mesesImpagos = [];

    for ($a = $anioUnion; $a <= $anioActual; $a++) {
        $desde = ($a === $anioUnion) ? $mesUnion : 1;
        $hasta = ($a === $anioActual) ? $mesActual : 12;

        for ($m = $desde; $m <= $hasta; $m++) {
            $clave = $a . '-' . str_pad((string)$m, 2, '0', STR_PAD_LEFT);
            $mesesEsperados[] = $clave;

            $pagado = isset($pagosPorAnio[(string)$a]) && in_array($m, $pagosPorAnio[(string)$a], true);
            if (!$pagado) {
                $deuda++;
                $mesesImpagos[] = $clave;
            }
        }
    }

    $estado = 'rojo';
    if ($deuda === 0) {
        $estado = 'verde';
    } elseif ($deuda <= 2) {
        $estado = 'amarillo';
    }

    return [
        'estado' => $estado,
        'deuda_meses' => $deuda,
        'meses_esperados' => $mesesEsperados,
        'meses_impagos' => $mesesImpagos
    ];
}

try {
    $conn->set_charset('utf8mb4');

    // ¿Existe la tabla pagos?
    $checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
    $tienePagos = ($checkPagosTable && $checkPagosTable->num_rows > 0);

    // Si existe, detectamos el nombre correcto de la FK: idSocios o idSocio
    $columnaPagos = 'idSocios';
    if ($tienePagos) {
        $checkColumn = $conn->query("SHOW COLUMNS FROM pagos LIKE 'idSocio'");
        if ($checkColumn && $checkColumn->num_rows > 0) {
            $columnaPagos = 'idSocio';
        }
    }

    // Detectar si existe anio_aplicado. Si no existe, se usa YEAR(fechaPago).
    $tieneAnioAplicado = false;
    if ($tienePagos) {
        $checkAnio = $conn->query("SHOW COLUMNS FROM pagos LIKE 'anio_aplicado'");
        $tieneAnioAplicado = ($checkAnio && $checkAnio->num_rows > 0);
    }

    $yearExpr = $tieneAnioAplicado
        ? "COALESCE(NULLIF(p.anio_aplicado,0), YEAR(p.fechaPago))"
        : "YEAR(p.fechaPago)";

    // Traemos socios activos sin mezclar pagos en el GROUP BY. Así evitamos perder el año del pago.
    $query = "
        SELECT 
            s.idSocios AS id,
            s.idSocios AS idSocios,
            s.nombre,
            s.apellido,
            s.DNI,
            s.domicilio,
            s.numero,
            s.domicilio_2,
            s.observacion,
            s.localidad,
            s.Fechaunion,
            s.Fechaunion AS fecha_union,
            s.telefono,
            s.email,
            c.Nombre_categoria AS categoria,
            c.Precio_Categoria AS precio_categoria,
            m.Medio_Pago AS medio_pago
        FROM socios s
        LEFT JOIN categorias c   ON s.idCategoria   = c.idCategorias
        LEFT JOIN mediospago m   ON s.idMedios_Pago = m.IdMedios_pago
        WHERE s.activo = 1
        ORDER BY s.apellido ASC, s.nombre ASC
    ";

    $result = $conn->query($query);
    if (!$result) {
        echo json_encode(["message" => "Error al ejecutar la consulta: " . $conn->error, "socios" => []], JSON_UNESCAPED_UNICODE);
        $conn->close();
        exit;
    }

    $sociosBase = [];
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int)$row['id'];
        $row['idSocios'] = (int)$row['idSocios'];
        $sociosBase[] = $row;
    }

    $pagosPorSocio = [];

    if ($tienePagos) {
        $sqlPagos = "
            SELECT
                p.$columnaPagos AS id_socio,
                $yearExpr AS anio,
                p.idMes AS idMes
            FROM pagos p
            INNER JOIN socios s ON s.idSocios = p.$columnaPagos
            WHERE s.activo = 1
              AND p.idMes IS NOT NULL
              AND p.idMes BETWEEN 1 AND 12
              AND $yearExpr IS NOT NULL
            ORDER BY p.$columnaPagos ASC, anio DESC, p.idMes ASC
        ";

        $resPagos = $conn->query($sqlPagos);
        if ($resPagos) {
            while ($p = $resPagos->fetch_assoc()) {
                $idSocio = (int)$p['id_socio'];
                $anio = (int)$p['anio'];
                $mes = (int)$p['idMes'];

                if ($idSocio <= 0 || $anio <= 0 || $mes < 1 || $mes > 12) continue;

                if (!isset($pagosPorSocio[$idSocio])) $pagosPorSocio[$idSocio] = [];
                if (!isset($pagosPorSocio[$idSocio][(string)$anio])) $pagosPorSocio[$idSocio][(string)$anio] = [];
                if (!in_array($mes, $pagosPorSocio[$idSocio][(string)$anio], true)) {
                    $pagosPorSocio[$idSocio][(string)$anio][] = $mes;
                }
            }
        }
    }

    $anioActual = (int)date('Y');
    $socios = [];

    foreach ($sociosBase as $row) {
        $idSocio = (int)$row['id'];
        $pagosAnio = isset($pagosPorSocio[$idSocio]) ? normalizarPagosPorAnio($pagosPorSocio[$idSocio]) : [];

        // Compatibilidad vieja: meses_pagados muestra SOLO los meses del año actual.
        // Antes mezclaba ENERO 2025 con ENERO 2026 y por eso figuraba "al día" cuando no correspondía.
        $mesesPagadosActual = [];
        if (isset($pagosAnio[(string)$anioActual])) {
            foreach ($pagosAnio[(string)$anioActual] as $mesId) {
                if (isset($nombresMesesArray[$mesId])) {
                    $mesesPagadosActual[] = $nombresMesesArray[$mesId];
                }
            }
        }

        $estadoCalc = calcularEstadoPagoSocio($row['Fechaunion'] ?? null, $pagosAnio, $nombresMesesArray);

        $row['meses_pagados'] = implode(', ', $mesesPagadosActual);
        $row['pagos_por_anio'] = $pagosAnio;
        $row['estado_pago'] = $estadoCalc['estado'];
        $row['deuda_meses'] = $estadoCalc['deuda_meses'];
        $row['meses_impagos'] = $estadoCalc['meses_impagos'];

        $socios[] = $row;
    }

    $extraData = obtenerCategoriasYMediosPago($conn);

    $meses = [];
    foreach ($nombresMesesArray as $id => $nombre) {
        $meses[] = ["id" => $id, "nombre" => ucfirst(strtolower($nombre))];
    }

    echo json_encode([
        "socios"     => $socios,
        "categorias" => $extraData["categorias"],
        "mediosPago" => $extraData["mediosPago"],
        "meses"      => $meses,
        "tienePagos" => $tienePagos
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error al obtener socios",
        "detalle" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} finally {
    if (isset($conn) && $conn) $conn->close();
}
