<?php
require_once(__DIR__ . '/../../config/db.php');

// Nombres de meses
$nombres_meses = [
    1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
    5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
    9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

// === CONFIGURÁ ACÁ el nombre real de la tabla de medios de pago ===
// Opciones típicas que vi en tu mensaje:
//   - 'medios_pago'        (con guión bajo)
//   - 'mediospago'         (sin guión bajo)
//   - 'agenda.mediospago'  (con esquema)
$TABLA_MEDIOS_PAGO = 'medios_pago';

// Helper: chequea si la tabla existe (si viene con esquema tipo agenda.mediospago también lo soporta)
function tablaExiste(mysqli $conn, string $nombreTabla): bool {
    if (strpos($nombreTabla, '.') !== false) {
        [$schema, $tabla] = explode('.', $nombreTabla, 2);
        $schema = $conn->real_escape_string($schema);
        $tabla  = $conn->real_escape_string($tabla);
        $sql = "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA='$schema' AND TABLE_NAME='$tabla' LIMIT 1";
    } else {
        $db = $conn->query("SELECT DATABASE() AS db")->fetch_assoc()['db'] ?? '';
        $tabla = $conn->real_escape_string($nombreTabla);
        $sql = "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA='$db' AND TABLE_NAME='$tabla' LIMIT 1";
    }
    $rs = $conn->query($sql);
    return $rs && $rs->num_rows > 0;
}

try {
    if ($conn->connect_error) {
        throw new Exception("Conexión fallida: " . $conn->connect_error);
    }

    // ==== Categorías (precios base y fecha agregado)
    $sql_categorias = "SELECT idCategorias, Precio_Categoria, fecha_agregado FROM categorias";
    $result_categorias = $conn->query($sql_categorias);
    if (!$result_categorias) {
        throw new Exception("Error en consulta de categorías: " . $conn->error);
    }

    $precios_base = [];
    $fechas_agregado = [];
    while ($row = $result_categorias->fetch_assoc()) {
        $precios_base[(int)$row['idCategorias']] = (float)$row['Precio_Categoria'];
        $fechas_agregado[(int)$row['idCategorias']] = $row['fecha_agregado'];
    }

    // ==== Histórico precios
    $sql_historicos = "SELECT idCategoria, idMes, precio_nuevo, precio_anterior, fecha_cambio
                       FROM historico_precios_categorias
                       ORDER BY idCategoria, idMes ASC";
    $result_historicos = $conn->query($sql_historicos);
    if (!$result_historicos) {
        // Si no existe la tabla de históricos, seguimos con base
        $precios_historicos = [];
        $precios_iniciales  = [];
    } else {
        $precios_historicos = [];
        $precios_iniciales  = [];
        while ($row = $result_historicos->fetch_assoc()) {
            $idCategoria = (int)$row['idCategoria'];
            $idMes = (int)$row['idMes'];
            $precios_historicos[$idCategoria][$idMes] = (float)$row['precio_nuevo'];
            if (!isset($precios_iniciales[$idCategoria])) {
                $precios_iniciales[$idCategoria] = (float)$row['precio_anterior'];
            }
        }
    }

    // Helpers de precio
    $encontrarIdMesParaFecha = function($fecha) {
        if (empty($fecha)) return 1;
        $fechaObj = new DateTime($fecha);
        return (int)$fechaObj->format('n');
    };

    $obtenerPrecioCorrecto = function($idCategoria, $mes_pago) use (
        $precios_historicos, $precios_base, $precios_iniciales, $fechas_agregado, $encontrarIdMesParaFecha
    ) {
        $fecha_agregado = $fechas_agregado[$idCategoria] ?? null;
        $idMesInicio = $encontrarIdMesParaFecha($fecha_agregado);
        if ($mes_pago < $idMesInicio) return 0.0;

        $precio_actual = $precios_iniciales[$idCategoria] ?? $precios_base[$idCategoria] ?? 0.0;

        if (!isset($precios_historicos[$idCategoria])) return (float)$precio_actual;

        $meses_cambio = array_keys($precios_historicos[$idCategoria]);
        sort($meses_cambio);
        foreach ($meses_cambio as $mes_cambio) {
            if ($mes_cambio <= $mes_pago) {
                $precio_actual = $precios_historicos[$idCategoria][$mes_cambio];
            } else {
                break;
            }
        }
        return (float)$precio_actual;
    };

    // ==== Armar SQL de pagos con (o sin) join a medios de pago
    $warnings = [];

    $joinMediosPagoOK = tablaExiste($conn, $TABLA_MEDIOS_PAGO);
    if (!$joinMediosPagoOK) {
        // Intento alternativo: si configuraste medios_pago pero existe mediospago, probamos ese.
        $alternativas = [];
        if ($TABLA_MEDIOS_PAGO !== 'mediospago') $alternativas[] = 'mediospago';
        if ($TABLA_MEDIOS_PAGO !== 'agenda.mediospago') $alternativas[] = 'agenda.mediospago';

        foreach ($alternativas as $alt) {
            if (tablaExiste($conn, $alt)) { $TABLA_MEDIOS_PAGO = $alt; $joinMediosPagoOK = true; break; }
        }
    }

    // Armado del LEFT JOIN sólo si existe la tabla
    $leftJoinMedios = '';
    $selectMedios   = 'NULL AS Medio_Pago, NULL AS idMedios_Pago_socio';
    if ($joinMediosPagoOK) {
        // Si viene con esquema (agenda.mediospago), armamos alias con comillas invertidas separadas
        if (strpos($TABLA_MEDIOS_PAGO, '.') !== false) {
            [$schema, $tabla] = explode('.', $TABLA_MEDIOS_PAGO, 2);
            $leftJoinMedios = "LEFT JOIN `{$schema}`.`{$tabla}` mp ON s.idMedios_Pago = mp.idMedios_Pago";
        } else {
            $leftJoinMedios = "LEFT JOIN `{$TABLA_MEDIOS_PAGO}` mp ON s.idMedios_Pago = mp.idMedios_Pago";
        }
        $selectMedios = "mp.Medio_Pago, s.idMedios_Pago AS idMedios_Pago_socio";
    } else {
        $warnings[] = "La tabla de medios de pago '{$TABLA_MEDIOS_PAGO}' no existe. Se devuelve Medio_Pago = null.";
    }

    $sql_pagos = "
        SELECT
            s.idSocios,
            s.Nombre,
            s.Apellido,
            c.idCategorias,
            c.Nombre_Categoria,
            c.fecha_agregado,
            p.fechaPago,
            p.idMes,
            p.idPago,
            MONTH(p.fechaPago) AS mes_pago,
            {$selectMedios}
        FROM pagos p
        INNER JOIN socios s     ON p.idSocios = s.idSocios
        INNER JOIN categorias c ON s.idCategoria = c.idCategorias
        {$leftJoinMedios}
        ORDER BY mes_pago, s.Apellido, s.Nombre, p.idMes
    ";

    $result_pagos = $conn->query($sql_pagos);
    if (!$result_pagos) {
        throw new Exception("Error en consulta de pagos: " . $conn->error);
    }

    $pagos_por_mes = [];
    $total_general = 0.0;

    while ($row = $result_pagos->fetch_assoc()) {
        $mes_pago       = (int)$row['mes_pago'];
        $id_categoria   = (int)$row['idCategorias'];
        $id_mes_pagado  = (int)$row['idMes'];

        $precio = $obtenerPrecioCorrecto($id_categoria, $mes_pago);

        if (!isset($pagos_por_mes[$mes_pago])) {
            $pagos_por_mes[$mes_pago] = [
                'nombre'   => $nombres_meses[$mes_pago] ?? '',
                'pagos'    => [],
                'subtotal' => 0.0
            ];
        }

        $pagos_por_mes[$mes_pago]['pagos'][] = [
            'idPago'           => (int)$row['idPago'],
            'Apellido'         => $row['Apellido'],
            'Nombre'           => $row['Nombre'],
            'Nombre_Categoria' => $row['Nombre_Categoria'],
            'Mes_Pagado'       => $nombres_meses[$id_mes_pagado] ?? '',
            'Precio'           => $precio,
            'fechaPago'        => $row['fechaPago'],
            'Medio_Pago'       => $row['Medio_Pago'] ?? null,
            'idMedios_Pago'    => $row['idMedios_Pago_socio'] ?? null
        ];

        $pagos_por_mes[$mes_pago]['subtotal'] += $precio;
        $total_general += $precio;
    }

    $resultado = array_values($pagos_por_mes);

    echo json_encode([
        'success' => true,
        'data'    => $resultado,
        'total'   => $total_general,
        'warning' => $warnings
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if ($conn && $conn instanceof mysqli) { $conn->close(); }
}
