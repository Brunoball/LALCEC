<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Headers para evitar caché
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener todos los cierres
    $sql = "SELECT * FROM cierres_mensuales ORDER BY anio DESC, FIELD(mes, 'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE') DESC";
    $result = $conn->query($sql);
    
    $cierres = [];
    while ($row = $result->fetch_assoc()) {
        $cierres[] = $row;
    }
    
    echo json_encode(['success' => true, 'data' => $cierres]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $mes = $data['mes'];
    $anio = $data['anio'];
    $total = $data['total_recaudado'];
    
    // Verificar si el mes anterior está cerrado
    $meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    $index = array_search($mes, $meses);
    $mes_anterior = $index > 0 ? $meses[$index - 1] : 'DICIEMBRE';
    $anio_anterior = $index > 0 ? $anio : $anio - 1;
    
    $sql_check = "SELECT estado FROM cierres_mensuales WHERE mes = ? AND anio = ?";
    $stmt = $conn->prepare($sql_check);
    $stmt->bind_param("si", $mes_anterior, $anio_anterior);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        if ($row['estado'] !== 'cerrado') {
            echo json_encode(['success' => false, 'message' => "No se puede cerrar $mes $anio sin cerrar primero $mes_anterior $anio_anterior"]);
            exit;
        }
    }
    
    // Cerrar el mes actual
    $sql = "INSERT INTO cierres_mensuales (mes, anio, fecha_cierre, total_recaudado, estado) 
            VALUES (?, ?, NOW(), ?, 'cerrado')
            ON DUPLICATE KEY UPDATE 
            fecha_cierre = NOW(), total_recaudado = ?, estado = 'cerrado'";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sidd", $mes, $anio, $total, $total);
    
    if ($stmt->execute()) {
        // Actualizar todos los pagos no asignados al mes contable cerrado
        $sql_update_pagos = "UPDATE pagos SET mes_contable = ? WHERE mes_contable = '' OR mes_contable IS NULL";
        $stmt_update = $conn->prepare($sql_update_pagos);
        $stmt_update->bind_param("s", $mes);
        $stmt_update->execute();
        
        echo json_encode(['success' => true, 'message' => "Mes $mes $anio cerrado correctamente"]);
    } else {
        echo json_encode(['success' => false, 'message' => "Error al cerrar el mes"]);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => "Método no permitido"]);
?>