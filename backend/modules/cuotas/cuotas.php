<?php
// cuotas.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

include_once(__DIR__ . '/../../config/db.php');

/* =========================
   Helpers
========================= */
function obtenerNumeroMes($mesNombre) {
    $meses = [
        'ENERO' => '01','FEBRERO'=>'02','MARZO'=>'03','ABRIL'=>'04',
        'MAYO'=>'05','JUNIO'=>'06','JULIO'=>'07','AGOSTO'=>'08',
        'SEPTIEMBRE'=>'09','OCTUBRE'=>'10','NOVIEMBRE'=>'11','DICIEMBRE'=>'12'
    ];
    return $meses[strtoupper($mesNombre)] ?? '01';
}

function obtenerRangoMes($mesNombre, $anio) {
    $anio = intval($anio);
    $mes = obtenerNumeroMes($mesNombre);
    $fechaInicio = DateTime::createFromFormat('Y-m-d', $anio.'-'.$mes.'-01');
    $fechaFin = clone $fechaInicio;
    $fechaFin->modify('last day of this month');
    return [
        'inicio' => $fechaInicio->format('Y-m-d'),
        'fin' => $fechaFin->format('Y-m-d')
    ];
}

/**
 * ✅ Precio vigente para un mes/año, cruzando años correctamente
 * - cutoff = primer día del mes siguiente
 * - toma el último historico con fecha_cambio < cutoff
 * - devuelve precio_nuevo
 * - fallback: categorias.Precio_Categoria
 */
function obtenerPrecioPorMes($conn, $idCategoria, $mesSeleccionado, $anioSeleccionado) {

    $idCategoria = (int)$idCategoria;
    $anioSeleccionado = (int)$anioSeleccionado;

    // 1) precio base (fallback)
    $sqlPrecioBase = "SELECT Precio_Categoria FROM categorias WHERE idCategorias = ?";
    $stmtBase = $conn->prepare($sqlPrecioBase);
    $stmtBase->bind_param("i", $idCategoria);
    $stmtBase->execute();
    $resultBase = $stmtBase->get_result();
    $precioBase = ($resultBase->num_rows > 0) ? (int)$resultBase->fetch_assoc()['Precio_Categoria'] : 0;
    $stmtBase->close();

    if ($mesSeleccionado === null || $mesSeleccionado === '' || strtoupper($mesSeleccionado) === 'TODOS') {
        return $precioBase;
    }

    // 2) calcular cutoff: primer día del mes siguiente (00:00:00)
    $mesNum = obtenerNumeroMes($mesSeleccionado); // "01".."12"
    $inicioMes = DateTime::createFromFormat('Y-m-d', sprintf('%04d-%s-01', $anioSeleccionado, $mesNum));
    if (!$inicioMes) return $precioBase;

    $cutoff = clone $inicioMes;
    $cutoff->modify('first day of next month');
    $cutoffStr = $cutoff->format('Y-m-d 00:00:00'); // 👈 clave del fix

    // 3) buscar último cambio antes del cutoff
    $sqlHist = "
        SELECT precio_nuevo
        FROM historico_precios_categorias
        WHERE idCategoria = ?
          AND fecha_cambio < ?
        ORDER BY fecha_cambio DESC, id_historico DESC
        LIMIT 1
    ";
    $stmtHist = $conn->prepare($sqlHist);
    $stmtHist->bind_param("is", $idCategoria, $cutoffStr);
    $stmtHist->execute();
    $resultHist = $stmtHist->get_result();

    if ($resultHist->num_rows > 0) {
        $precio = (int)$resultHist->fetch_assoc()['precio_nuevo'];
        $stmtHist->close();
        return $precio > 0 ? $precio : $precioBase;
    }

    $stmtHist->close();
    return $precioBase;
}

/* =========================
   Params
========================= */
$tipo   = $_GET['tipo']   ?? '';
$estado = $_GET['estado'] ?? '';
$mes    = $_GET['mes']    ?? '';
$anio   = $_GET['anio']   ?? '';

if (!$tipo || !$estado || !$mes || !$anio) {
    echo json_encode(["error" => "Parámetros faltantes (tipo, estado, mes, anio)."]);
    exit;
}

$rangoMes    = obtenerRangoMes($mes, $anio);
$fechaFinMes = $rangoMes['fin'];
$anioInt     = (int)$anio;

/* ===========================
   SOCIOS PAGADOS (activo=1)
=========================== */
if ($tipo === "socio" && $estado === "pagado") {
    $sql = "
        SELECT DISTINCT 
               s.idSocios, 
               s.nombre, 
               s.apellido, 
               s.domicilio_2 AS domicilio, 
               s.numero, 
               s.idCategoria, 
               c.Nombre_Categoria AS categoria, 
               COALESCE(m.Medio_Pago, '-') AS medio_pago
        FROM pagos p
        JOIN socios s          ON p.idSocios = s.idSocios
        LEFT JOIN categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE p.idMes = (SELECT idMes FROM meses_pagos WHERE mes = ? LIMIT 1)
          AND YEAR(p.fechaPago) = ?
          AND s.Fechaunion <= ?
          AND s.activo = 1
        GROUP BY s.idSocios
        ORDER BY s.apellido ASC
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sis", $mes, $anioInt, $fechaFinMes);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $row['precio_categoria'] = obtenerPrecioPorMes($conn, (int)$row['idCategoria'], $mes, $anioInt);
        $data[] = $row;
    }
    echo json_encode($data);
    exit;
}

/* ===========================
   SOCIOS DEUDORES (activo=1)
=========================== */
if ($tipo === "socio" && $estado === "deudor") {
    $sqlPagados = "
        SELECT p.idSocios 
        FROM pagos p 
        JOIN meses_pagos mp ON p.idMes = mp.idMes 
        WHERE mp.mes = ? AND YEAR(p.fechaPago) = ?
    ";
    $stmtPag = $conn->prepare($sqlPagados);
    $stmtPag->bind_param("si", $mes, $anioInt);
    $stmtPag->execute();
    $resultPag = $stmtPag->get_result();

    $idsPagados = [];
    while ($row = $resultPag->fetch_assoc()) {
        $idsPagados[] = (int)$row['idSocios'];
    }

    $sqlSocios = "
        SELECT 
            s.idSocios, 
            COALESCE(s.nombre, '')       AS nombre, 
            COALESCE(s.apellido, '')     AS apellido,
            COALESCE(s.domicilio_2, '')  AS domicilio, 
            COALESCE(s.numero, '')       AS numero,
            COALESCE(s.idCategoria, 0)   AS idCategoria,
            COALESCE(c.Nombre_Categoria, '') AS categoria,
            COALESCE(mp.Medio_Pago, '-') AS medio_pago
        FROM socios s
        LEFT JOIN categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN mediospago mp ON s.idMedios_Pago = mp.IdMedios_pago
        WHERE s.Fechaunion <= ?
          AND s.activo = 1
    ";
    $stmtSocios = $conn->prepare($sqlSocios);
    $stmtSocios->bind_param("s", $fechaFinMes);
    $stmtSocios->execute();
    $result = $stmtSocios->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        if (!in_array((int)$row['idSocios'], $idsPagados, true)) {
            $row['precio_categoria'] = obtenerPrecioPorMes($conn, (int)$row['idCategoria'], $mes, $anioInt);
            $data[] = $row;
        }
    }

    usort($data, fn($a, $b) => strcmp($a['apellido'], $b['apellido']));
    echo json_encode($data);
    exit;
}

/* ======================
   EMPRESAS PAGADAS
====================== */
if ($tipo === "empresa" && $estado === "pagado") {
    $sql = "
        SELECT DISTINCT 
               e.idEmp, 
               COALESCE(e.razon_social, '') AS razon_social,
               COALESCE(e.domicilio_2, '')  AS domicilio,
               COALESCE(c.Nombre_Categoria, '') AS categoria,
               e.idCategorias,
               COALESCE(mp.Medio_Pago, '-') AS medio_pago
        FROM pagos_empresas p
        JOIN empresas e         ON p.idEmp = e.idEmp
        LEFT JOIN categorias c  ON e.idCategorias = c.idCategorias
        LEFT JOIN mediospago mp ON e.idMedios_Pago = mp.IdMedios_pago
        WHERE p.idMes = (SELECT idMes FROM meses_pagos WHERE mes = ? LIMIT 1)
          AND YEAR(p.fechaPago) = ?
          AND e.fechaunion <= ?
        GROUP BY e.idEmp
        ORDER BY e.razon_social ASC
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sis", $mes, $anioInt, $fechaFinMes);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $row['precio_categoria'] = obtenerPrecioPorMes($conn, (int)$row['idCategorias'], $mes, $anioInt);
        $data[] = $row;
    }
    echo json_encode($data);
    exit;
}

/* =======================
   EMPRESAS DEUDORAS
======================= */
if ($tipo === "empresa" && $estado === "deudor") {
    $sqlPagados = "
        SELECT pe.idEmp 
        FROM pagos_empresas pe 
        JOIN meses_pagos mp ON pe.idMes = mp.idMes 
        WHERE mp.mes = ? AND YEAR(pe.fechaPago) = ?
    ";
    $stmtPag = $conn->prepare($sqlPagados);
    $stmtPag->bind_param("si", $mes, $anioInt);
    $stmtPag->execute();
    $resultPag = $stmtPag->get_result();

    $idsPagadas = [];
    while ($row = $resultPag->fetch_assoc()) {
        $idsPagadas[] = (int)$row['idEmp'];
    }

    $sqlEmpresas = "
        SELECT 
            e.idEmp, 
            COALESCE(e.razon_social, '') AS razon_social, 
            COALESCE(e.domicilio_2, '')  AS domicilio, 
            COALESCE(c.Nombre_Categoria, '') AS categoria,
            COALESCE(mp.Medio_Pago, '-') AS medio_pago,
            e.idCategorias
        FROM empresas e
        LEFT JOIN categorias c  ON e.idCategorias = c.idCategorias
        LEFT JOIN mediospago mp ON e.idMedios_Pago = mp.IdMedios_pago
        WHERE e.fechaunion <= ?
    ";
    $stmtEmpresas = $conn->prepare($sqlEmpresas);
    $stmtEmpresas->bind_param("s", $fechaFinMes);
    $stmtEmpresas->execute();
    $result = $stmtEmpresas->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        if (!in_array((int)$row['idEmp'], $idsPagadas, true)) {
            $row['precio_categoria'] = obtenerPrecioPorMes($conn, (int)$row['idCategorias'], $mes, $anioInt);
            $data[] = $row;
        }
    }

    usort($data, fn($a, $b) => strcmp($a['razon_social'], $b['razon_social']));
    echo json_encode($data);
    exit;
}

echo json_encode(["error" => "Combinación de tipo y estado no válida."]);
$conn->close();
