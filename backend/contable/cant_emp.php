<?php
require_once "../db.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

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

// Empresas por categoría por mes acumulado
function obtenerEmpresasPorCategoriaPorMes($conn) {
    $resultados = [];

    // Obtener nombres de categorías
    $categorias = [];
    $stmt = $conn->query("SELECT idCategorias, Nombre_Categoria FROM categorias");
    while ($row = $stmt->fetch_assoc()) {
        $categorias[$row['idCategorias']] = $row['Nombre_Categoria'];
    }

    // Inicializar estructura
    for ($mes = 1; $mes <= 12; $mes++) {
        $resultados[$mes] = [];
        foreach ($categorias as $cat) {
            $resultados[$mes][$cat] = 0;
        }
        $resultados[$mes]['Sin categoría'] = 0;
    }

    // Traer empresas con categoría y mes de unión
    $query = "SELECT 
                e.idCategorias, 
                c.Nombre_Categoria as categoria,
                MONTH(e.fechaunion) as mes_union
              FROM empresas e
              LEFT JOIN categorias c ON e.idCategorias = c.idCategorias";
    $res = $conn->query($query);

    while ($row = $res->fetch_assoc()) {
        $cat = $row['categoria'] ?? 'Sin categoría';
        $mesUnion = (int)$row['mes_union'];

        if ($cat === '') {
            $cat = 'Sin categoría';
        }

        // Sumar a partir del mes de unión hasta diciembre
        for ($mes = $mesUnion; $mes <= 12; $mes++) {
            if (!isset($resultados[$mes][$cat])) {
                $resultados[$mes][$cat] = 0;
            }
            $resultados[$mes][$cat]++;
        }
    }

    // Formatear para frontend
    $formattedResult = [];
    foreach ($resultados as $mes => $categoriasData) {
        $formattedResult[$mes] = [
            'nombreMes' => obtenerMesNombre($conn, $mes),
            'categorias' => $categoriasData
        ];
    }

    return $formattedResult;
}

// Construir datos
$data = [
    'totalEmpresas' => contarTotalesEmpresas($conn),
    'empresasPorMes' => [],
    'empresasPorCategoriaPorMes' => obtenerEmpresasPorCategoriaPorMes($conn)
];

// Preparar datos por mes con nombre del mes
$acumulados = obtenerAcumuladoEmpresasHastaMes($conn);
for ($mes = 1; $mes <= 12; $mes++) {
    $data['empresasPorMes'][] = [
        'mes' => $mes,
        'nombreMes' => obtenerMesNombre($conn, $mes),
        'total' => $acumulados[$mes]
    ];
}

// Enviar JSON
echo json_encode([
    'success' => true,
    'data' => $data
]);

$conn->close();
?>
