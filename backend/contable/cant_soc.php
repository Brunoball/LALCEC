<?php
require_once "../db.php";

// Función para obtener nombre del mes
function obtenerMesNombre($conn, $idMes) {
    $stmt = $conn->prepare("SELECT mes FROM meses_pagos WHERE idMes = ?");
    $stmt->bind_param("i", $idMes);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    return $result ? $result['mes'] : 'Mes desconocido';
}

// Total de socios en la tabla
function contarTotales($conn, $tabla) {
    $sql = "SELECT COUNT(*) AS total FROM $tabla";
    $result = $conn->query($sql);
    return $result->fetch_assoc()['total'];
}

// Obtener el acumulado hasta cada mes (socios registrados)
function obtenerAcumuladoHastaMes($conn, $tabla, $fechaUnionColumna) {
    $acumulados = [];
    $totalGeneral = contarTotales($conn, $tabla);
    
    $sqlNuevos = "SELECT MONTH($fechaUnionColumna) AS mes, COUNT(*) AS cantidad
                 FROM $tabla
                 GROUP BY mes
                 ORDER BY mes ASC";
    $resultNuevos = $conn->query($sqlNuevos);
    $nuevosPorMes = [];

    while ($row = $resultNuevos->fetch_assoc()) {
        $nuevosPorMes[$row['mes']] = $row['cantidad'];
    }

    for ($i = 1; $i <= 12; $i++) {
        if (!isset($nuevosPorMes[$i])) {
            $nuevosPorMes[$i] = 0;
        }
    }

    $acumulado = $totalGeneral;
    for ($i = 12; $i >= 1; $i--) {
        $acumulados[$i] = $acumulado;
        $acumulado -= $nuevosPorMes[$i];
    }

    return $acumulados;
}

// Obtener la cantidad de socios por categoría
function obtenerCantidadPorCategoria($conn) {
    $categoriasTotales = [];

    $stmt = $conn->prepare("SELECT idCategorias, Nombre_Categoria FROM categorias");
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $idCategoria = $row['idCategorias'];
        $nombreCategoria = $row['Nombre_Categoria'];

        $stmtSocios = $conn->prepare("SELECT COUNT(*) AS cantidad FROM socios WHERE idCategoria = ?");
        $stmtSocios->bind_param("i", $idCategoria);
        $stmtSocios->execute();
        $resultSocios = $stmtSocios->get_result()->fetch_assoc();
        
        $categoriasTotales[$nombreCategoria] = $resultSocios['cantidad'];
    }

    $stmtSinCategoria = $conn->prepare("SELECT COUNT(*) AS cantidad FROM socios WHERE idCategoria IS NULL OR idCategoria = ''");
    $stmtSinCategoria->execute();
    $resultSinCategoria = $stmtSinCategoria->get_result()->fetch_assoc();
    
    $categoriasTotales['Sin categoría'] = $resultSinCategoria['cantidad'];

    return $categoriasTotales;
}

// Obtener socios por categoría hasta cada mes - VERSIÓN FINAL CORREGIDA
function obtenerSociosPorCategoriaPorMes($conn) {
    $resultados = [];
    
    // Obtener todas las categorías con sus nombres
    $categoriasNombres = [];
    $stmtCats = $conn->query("SELECT idCategorias, Nombre_Categoria FROM categorias");
    while ($row = $stmtCats->fetch_assoc()) {
        $categoriasNombres[$row['idCategorias']] = $row['Nombre_Categoria'];
    }
    
    // Asegurarse de que todas las categorías estén presentes, incluyendo 'Sin categoría'
    $categoriasUnicas = array_values($categoriasNombres);
    $categoriasUnicas[] = 'Sin categoría';
    
    // Obtener el año más reciente con datos
    $stmtYear = $conn->query("SELECT YEAR(MAX(Fechaunion)) as max_year FROM socios");
    $year = $stmtYear->fetch_assoc()['max_year'] ?? date('Y');
    
    // Inicializar contadores para cada mes
    for ($mes = 1; $mes <= 12; $mes++) {
        foreach ($categoriasUnicas as $cat) {
            if (!isset($resultados[$mes][$cat])) {
                $resultados[$mes][$cat] = 0; // Inicializar a 0 si no existe
            }
        }
    }
    
    // Obtener todos los socios con su categoría y fecha de unión
    $query = "SELECT 
                s.idCategoria, 
                c.Nombre_Categoria as categoria,
                MONTH(s.Fechaunion) as mes_union
              FROM socios s
              LEFT JOIN categorias c ON s.idCategoria = c.idCategorias";
    $result = $conn->query($query);
    
    // Procesar cada socio
    while ($row = $result->fetch_assoc()) {
        $categoria = $row['categoria'] ?? 'Sin categoría';
        $mesUnion = $row['mes_union'];
        
        // A partir del mes de unión, incrementar el contador para esa categoría
        for ($mes = $mesUnion; $mes <= 12; $mes++) {
            // Validación: si la categoría no está, inicializarla
            if (!isset($resultados[$mes][$categoria])) {
                $resultados[$mes][$categoria] = 0;
            }
            $resultados[$mes][$categoria]++;
        }
    }
    
    return $resultados;
}

// Obtener datos
$totalSocios = contarTotales($conn, "socios");
$sociosPorMes = obtenerAcumuladoHastaMes($conn, "socios", "Fechaunion");
$categoriasTotales = obtenerCantidadPorCategoria($conn);
$sociosPorCategoriaPorMes = obtenerSociosPorCategoriaPorMes($conn);
?>

<!DOCTYPE html>
<html>
<head>
    <title>Reporte de Socios</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>

<h2>Totales Generales</h2>
<ul>
    <li>Total de Socios: <strong><?= $totalSocios ?></strong></li>
</ul>

<h2>Total de Socios por Categoría</h2>
<table>
    <tr>
        <th>Categoría</th>
        <th>Total de Socios</th>
    </tr>
    <?php foreach ($categoriasTotales as $categoria => $cantidad): ?>
    <tr>
        <td><?= htmlspecialchars($categoria) ?></td>
        <td><?= $cantidad ?></td>
    </tr>
    <?php endforeach; ?>
</table>

<h2>Total de Socios por Mes (Acumulado)</h2>
<table>
    <tr>
        <th>Mes</th>
        <th>Total de Socios</th>
    </tr>
    <?php for ($mes = 1; $mes <= 12; $mes++): ?>
    <tr>
        <td><?= htmlspecialchars(obtenerMesNombre($conn, $mes)) ?></td>
        <td><?= $sociosPorMes[$mes] ?></td>
    </tr>
    <?php endfor; ?>
</table>

<h2>Socios por Categoría en cada Mes</h2>
<table>
    <tr>
        <th>Mes</th>
        <?php foreach (array_keys($categoriasTotales) as $categoria): ?>
            <th><?= htmlspecialchars($categoria) ?></th>
        <?php endforeach; ?>
    </tr>
    <?php for ($mes = 1; $mes <= 12; $mes++): ?>
    <tr>
        <td><?= htmlspecialchars(obtenerMesNombre($conn, $mes)) ?></td>
        <?php foreach (array_keys($categoriasTotales) as $categoria): ?>
            <td><?= $sociosPorCategoriaPorMes[$mes][$categoria] ?? 0 ?></td>
        <?php endforeach; ?>
    </tr>
    <?php endfor; ?>
</table>

</body>
</html>
