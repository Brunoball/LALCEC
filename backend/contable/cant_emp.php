<?php
require_once "../db.php";

// Obtener nombre del mes
function obtenerMesNombre($conn, $idMes) {
    $stmt = $conn->prepare("SELECT mes FROM meses_pagos WHERE idMes = ?");
    $stmt->bind_param("i", $idMes);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    return $result ? $result['mes'] : 'Mes desconocido';
}

// Total de empresas
function contarTotalesEmpresas($conn) {
    $sql = "SELECT COUNT(*) AS total FROM empresas";
    $result = $conn->query($sql);
    return $result->fetch_assoc()['total'];
}

// Acumulado mensual de empresas registradas
function obtenerAcumuladoEmpresasHastaMes($conn) {
    $acumulados = [];
    $totalGeneral = contarTotalesEmpresas($conn);

    $sql = "SELECT MONTH(fechaunion) AS mes, COUNT(*) AS cantidad
            FROM empresas
            GROUP BY mes
            ORDER BY mes ASC";
    $result = $conn->query($sql);

    $nuevasPorMes = [];
    while ($row = $result->fetch_assoc()) {
        $nuevasPorMes[$row['mes']] = $row['cantidad'];
    }

    for ($i = 1; $i <= 12; $i++) {
        if (!isset($nuevasPorMes[$i])) {
            $nuevasPorMes[$i] = 0;
        }
    }

    $acumulado = $totalGeneral;
    for ($i = 12; $i >= 1; $i--) {
        $acumulados[$i] = $acumulado;
        $acumulado -= $nuevasPorMes[$i];
    }

    return $acumulados;
}

// Total de empresas por categoría
function obtenerEmpresasPorCategoria($conn) {
    $totales = [];

    $stmt = $conn->query("SELECT idCategorias, Nombre_Categoria FROM categorias");
    while ($cat = $stmt->fetch_assoc()) {
        $id = $cat['idCategorias'];
        $nombre = $cat['Nombre_Categoria'];

        $stmtEmp = $conn->prepare("SELECT COUNT(*) AS cantidad FROM empresas WHERE idCategorias = ?");
        $stmtEmp->bind_param("i", $id);
        $stmtEmp->execute();
        $res = $stmtEmp->get_result()->fetch_assoc();

        $totales[$nombre] = $res['cantidad'];
    }

    // Sin categoría
    $stmtSin = $conn->query("SELECT COUNT(*) AS cantidad FROM empresas WHERE idCategorias IS NULL OR idCategorias = ''");
    $totales['Sin categoría'] = $stmtSin->fetch_assoc()['cantidad'];

    return $totales;
}

// Empresas por categoría por mes acumulado
function obtenerEmpresasPorCategoriaPorMes($conn) {
    $resultados = [];

    // Obtener todas las categorías incluyendo 'Sin categoría'
    $catNombres = [];
    $stmt = $conn->query("SELECT idCategorias, Nombre_Categoria FROM categorias");
    while ($row = $stmt->fetch_assoc()) {
        $catNombres[$row['idCategorias']] = $row['Nombre_Categoria'];
    }
    $categorias = array_values($catNombres);
    $categorias[] = 'Sin categoría';

    // Inicializar todas las categorías para cada mes
    for ($mes = 1; $mes <= 12; $mes++) {
        foreach ($categorias as $cat) {
            $resultados[$mes][$cat] = 0;
        }
    }

    // Consultar todas las empresas con su categoría y mes de unión
    $query = "SELECT 
                e.idCategorias, 
                c.Nombre_Categoria as categoria,
                MONTH(e.fechaunion) as mes_union
              FROM empresas e
              LEFT JOIN categorias c ON e.idCategorias = c.idCategorias";
    $res = $conn->query($query);

    while ($row = $res->fetch_assoc()) {
        $cat = $row['categoria'] ?? 'Sin categoría';
        $mesUnion = $row['mes_union'];

        // Evitar categoría vacía
        if ($cat === '') {
            $cat = 'Sin categoría';
        }

        // Sumar a partir del mes de unión hasta diciembre
        for ($mes = $mesUnion; $mes <= 12; $mes++) {
            if (!isset($resultados[$mes][$cat])) {
                $resultados[$mes][$cat] = 0; // Por seguridad
            }
            $resultados[$mes][$cat]++;
        }
    }

    return $resultados;
}


// Datos
$totalEmpresas = contarTotalesEmpresas($conn);
$empresasPorMes = obtenerAcumuladoEmpresasHastaMes($conn);
$empresasPorCategoria = obtenerEmpresasPorCategoria($conn);
$empresasPorCategoriaPorMes = obtenerEmpresasPorCategoriaPorMes($conn);
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reporte de Empresas</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 6px;
            text-align: center;
        }
        th {
            background-color: #eee;
        }
    </style>
</head>
<body>

<h2>Totales Generales</h2>
<ul>
    <li>Total de Empresas: <strong><?= $totalEmpresas ?></strong></li>
</ul>

<h2>Total de Empresas por Categoría</h2>
<table>
    <tr>
        <th>Categoría</th>
        <th>Total</th>
    </tr>
    <?php foreach ($empresasPorCategoria as $cat => $cant): ?>
    <tr>
        <td><?= htmlspecialchars($cat) ?></td>
        <td><?= $cant ?></td>
    </tr>
    <?php endforeach; ?>
</table>

<h2>Total de Empresas por Mes (Acumulado)</h2>
<table>
    <tr>
        <th>Mes</th>
        <th>Total</th>
    </tr>
    <?php for ($mes = 1; $mes <= 12; $mes++): ?>
    <tr>
        <td><?= obtenerMesNombre($conn, $mes) ?></td>
        <td><?= $empresasPorMes[$mes] ?></td>
    </tr>
    <?php endfor; ?>
</table>

<h2>Empresas por Categoría en cada Mes</h2>
<table>
    <tr>
        <th>Mes</th>
        <?php foreach (array_keys($empresasPorCategoria) as $cat): ?>
            <th><?= htmlspecialchars($cat) ?></th>
        <?php endforeach; ?>
    </tr>
    <?php for ($mes = 1; $mes <= 12; $mes++): ?>
    <tr>
        <td><?= obtenerMesNombre($conn, $mes) ?></td>
        <?php foreach (array_keys($empresasPorCategoria) as $cat): ?>
            <td><?= $empresasPorCategoriaPorMes[$mes][$cat] ?? 0 ?></td>
        <?php endforeach; ?>
    </tr>
    <?php endfor; ?>
</table>

</body>
</html>
