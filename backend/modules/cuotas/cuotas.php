<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

include_once(__DIR__ . '/../../config/db.php');

// Función para obtener el rango de fechas del mes seleccionado
function obtenerRangoMes($conn, $mesNombre) {
    // Año actual (ajustar si necesitás otros años)
    $añoActual = date('Y');

    // Primer día del mes
    $fechaInicio = DateTime::createFromFormat('Y-m-d', $añoActual.'-'.obtenerNumeroMes($mesNombre).'-01');

    // Último día del mes
    $fechaFin = clone $fechaInicio;
    $fechaFin->modify('last day of this month');

    return [
        'inicio' => $fechaInicio->format('Y-m-d'),
        'fin' => $fechaFin->format('Y-m-d')
    ];
}

// Función auxiliar para convertir nombre de mes a número
function obtenerNumeroMes($mesNombre) {
    $meses = [
        'ENERO' => '01', 'FEBRERO' => '02', 'MARZO' => '03', 'ABRIL' => '04',
        'MAYO' => '05', 'JUNIO' => '06', 'JULIO' => '07', 'AGOSTO' => '08',
        'SEPTIEMBRE' => '09', 'OCTUBRE' => '10', 'NOVIEMBRE' => '11', 'DICIEMBRE' => '12'
    ];
    return $meses[strtoupper($mesNombre)] ?? '01';
}

function obtenerPrecioPorMes($conn, $idCategoria, $mesSeleccionado) {
    $sqlPrecioBase = "SELECT Precio_Categoria FROM categorias WHERE idCategorias = ?";
    $stmtBase = $conn->prepare($sqlPrecioBase);
    $stmtBase->bind_param("i", $idCategoria);
    $stmtBase->execute();
    $resultBase = $stmtBase->get_result();
    $precioActual = ($resultBase->num_rows > 0) ? $resultBase->fetch_assoc()['Precio_Categoria'] : 0;

    if ($mesSeleccionado === null || $mesSeleccionado === 'Todos') return $precioActual;

    $sqlMesId = "SELECT idMes FROM meses_pagos WHERE mes = ?";
    $stmtMes = $conn->prepare($sqlMesId);
    $stmtMes->bind_param("s", $mesSeleccionado);
    $stmtMes->execute();
    $resultMes = $stmtMes->get_result();
    if ($resultMes->num_rows === 0) return $precioActual;

    $idMesSeleccionado = $resultMes->fetch_assoc()['idMes'];

    $sqlHistorico = "SELECT precio_anterior 
                     FROM historico_precios_categorias 
                     WHERE idCategoria = ? AND idMes > ? 
                     ORDER BY idMes ASC
                     LIMIT 1";
    $stmtHist = $conn->prepare($sqlHistorico);
    $stmtHist->bind_param("ii", $idCategoria, $idMesSeleccionado);
    $stmtHist->execute();
    $resultHist = $stmtHist->get_result();

    if ($resultHist->num_rows > 0) {
        return $resultHist->fetch_assoc()['precio_anterior'];
    }

    return $precioActual;
}

$tipo   = $_GET['tipo']   ?? '';
$estado = $_GET['estado'] ?? '';
$mes    = $_GET['mes']    ?? '';

if (!$tipo || !$estado || !$mes) {
    echo json_encode(["error" => "Parámetros faltantes."]);
    exit;
}

// Rango del mes seleccionado
$rangoMes   = obtenerRangoMes($conn, $mes);
$fechaFinMes = $rangoMes['fin'];

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
        JOIN socios s        ON p.idSocios = s.idSocios
        LEFT JOIN categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE p.idMes = (SELECT idMes FROM meses_pagos WHERE mes = ? LIMIT 1)
          AND s.Fechaunion <= ?
          AND s.activo = 1
        GROUP BY s.idSocios
        ORDER BY s.apellido ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $mes, $fechaFinMes);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $row['precio_categoria'] = obtenerPrecioPorMes($conn, $row['idCategoria'], $mes);
        $data[] = $row;
    }
    echo json_encode($data);
    exit;
}

/* =============================
   SOCIOS DEUDORES (activo=1)
============================= */
if ($tipo === "socio" && $estado === "deudor") {
    // IDs de socios que ya pagaron este mes
    $sqlPagados = "
        SELECT p.idSocios 
        FROM pagos p 
        JOIN meses_pagos mp ON p.idMes = mp.idMes 
        WHERE mp.mes = ?
    ";
    $stmtPag = $conn->prepare($sqlPagados);
    $stmtPag->bind_param("s", $mes);
    $stmtPag->execute();
    $resultPag = $stmtPag->get_result();

    $idsPagados = [];
    while ($row = $resultPag->fetch_assoc()) {
        $idsPagados[] = $row['idSocios'];
    }

    // Todos los socios activos que estaban registrados en ese mes (y no pagaron)
    $sqlSocios = "
        SELECT 
            s.idSocios, 
            COALESCE(s.nombre, '')     AS nombre, 
            COALESCE(s.apellido, '')   AS apellido,
            COALESCE(s.domicilio_2, '') AS domicilio, 
            COALESCE(s.numero, '')     AS numero,
            COALESCE(s.idCategoria, 0) AS idCategoria,
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
        if (!in_array($row['idSocios'], $idsPagados)) {
            $row['precio_categoria'] = obtenerPrecioPorMes($conn, $row['idCategoria'], $mes);
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
        JOIN empresas e        ON p.idEmp = e.idEmp
        LEFT JOIN categorias c ON e.idCategorias = c.idCategorias
        LEFT JOIN mediospago mp ON e.idMedios_Pago = mp.IdMedios_pago
        WHERE p.idMes = (SELECT idMes FROM meses_pagos WHERE mes = ? LIMIT 1)
          AND e.fechaunion <= ?
        GROUP BY e.idEmp
        ORDER BY e.razon_social ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $mes, $fechaFinMes);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $row['precio_categoria'] = obtenerPrecioPorMes($conn, $row['idCategorias'], $mes);
        $data[] = $row;
    }

    echo json_encode($data);
    exit;
}

/* =======================
   EMPRESAS DEUDORAS
======================= */
if ($tipo === "empresa" && $estado === "deudor") {
    // IDs de empresas que ya pagaron este mes
    $sqlPagados = "
        SELECT pe.idEmp 
        FROM pagos_empresas pe 
        JOIN meses_pagos mp ON pe.idMes = mp.idMes 
        WHERE mp.mes = ?
    ";
    $stmtPag = $conn->prepare($sqlPagados);
    $stmtPag->bind_param("s", $mes);
    $stmtPag->execute();
    $resultPag = $stmtPag->get_result();

    $idsPagadas = [];
    while ($row = $resultPag->fetch_assoc()) {
        $idsPagadas[] = $row['idEmp'];
    }

    // Todas las empresas registradas en ese mes (y que no pagaron)
    $sqlEmpresas = "
        SELECT 
            e.idEmp, 
            COALESCE(e.razon_social, '') AS razon_social, 
            COALESCE(e.domicilio_2, '')  AS domicilio, 
            COALESCE(c.Nombre_Categoria, '') AS categoria,
            COALESCE(mp.Medio_Pago, '-') AS medio_pago,
            e.idCategorias
        FROM empresas e
        LEFT JOIN categorias c ON e.idCategorias = c.idCategorias
        LEFT JOIN mediospago mp ON e.idMedios_Pago = mp.IdMedios_pago
        WHERE e.fechaunion <= ?
    ";

    $stmtEmpresas = $conn->prepare($sqlEmpresas);
    $stmtEmpresas->bind_param("s", $fechaFinMes);
    $stmtEmpresas->execute();
    $result = $stmtEmpresas->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        if (!in_array($row['idEmp'], $idsPagadas)) {
            $row['precio_categoria'] = obtenerPrecioPorMes($conn, $row['idCategorias'], $mes);
            $data[] = $row;
        }
    }

    usort($data, fn($a, $b) => strcmp($a['razon_social'], $b['razon_social']));
    echo json_encode($data);
    exit;
}

echo json_encode(["error" => "Combinación de tipo y estado no válida."]);
$conn->close();
