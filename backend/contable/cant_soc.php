<?php
require_once "../db.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

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

// Función mejorada para obtener socios por categoría por mes
function obtenerSociosPorCategoriaPorMes($conn) {
    $resultados = [];
    
    // Obtener todas las categorías con sus nombres
    $categorias = [];
    $stmtCats = $conn->query("SELECT idCategorias, Nombre_Categoria FROM categorias");
    while ($row = $stmtCats->fetch_assoc()) {
        $categorias[$row['idCategorias']] = $row['Nombre_Categoria'];
    }
    
    // Inicializar estructura para todos los meses
    for ($mes = 1; $mes <= 12; $mes++) {
        $resultados[$mes] = [];
        foreach ($categorias as $cat) {
            $resultados[$mes][$cat] = 0;
        }
        $resultados[$mes]['Sin categoría'] = 0;
    }
    
    // Obtener todos los socios con su categoría y fecha de unión
    $query = "SELECT 
                s.idSocios,
                s.idCategoria, 
                c.Nombre_Categoria as categoria,
                MONTH(s.Fechaunion) as mes_union
              FROM socios s
              LEFT JOIN categorias c ON s.idCategoria = c.idCategorias";
    
    $result = $conn->query($query);
    
    // Procesar cada socio
    while ($row = $result->fetch_assoc()) {
        $categoria = $row['categoria'] ?? 'Sin categoría';
        $mesUnion = (int)$row['mes_union'];
        
        // Si no existe la categoría en el array, la añadimos
        if (!isset($resultados[$mesUnion][$categoria])) {
            $resultados[$mesUnion][$categoria] = 0;
        }
        
        // Para cada mes desde el mes de unión hasta diciembre, sumamos 1
        for ($mes = $mesUnion; $mes <= 12; $mes++) {
            $resultados[$mes][$categoria]++;
        }
    }
    
    // Formatear el resultado para el frontend
    $formattedResult = [];
    foreach ($resultados as $mes => $categoriasData) {
        $formattedResult[$mes] = [
            'nombreMes' => obtenerMesNombre($conn, $mes),
            'categorias' => $categoriasData
        ];
    }
    
    return $formattedResult;
}


// Obtener datos
$data = [
    'totalSocios' => contarTotales($conn, "socios"),
    'sociosPorMes' => [],
    'sociosPorCategoriaPorMes' => obtenerSociosPorCategoriaPorMes($conn)
];

// Preparar datos de socios por mes con nombres de mes
for ($mes = 1; $mes <= 12; $mes++) {
    $data['sociosPorMes'][] = [
        'mes' => $mes,
        'nombreMes' => obtenerMesNombre($conn, $mes),
        'total' => obtenerAcumuladoHastaMes($conn, "socios", "Fechaunion")[$mes]
    ];
}

// Convertir a JSON y enviar respuesta
echo json_encode([
    'success' => true,
    'data' => $data
]);

// Cerrar conexión
$conn->close();
?>
