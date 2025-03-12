<?php
// Archivo: obtener_meses_pagos_empresas.php
header("Access-Control-Allow-Origin: http://localhost:3003");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include('db.php');

if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => "Connection failed: " . $conn->connect_error]));
}

$data = json_decode(file_get_contents('php://input'), true);
$razonSocial = $data['razonSocial'] ?? null;

if (!$razonSocial) {
    echo json_encode(['success' => false, 'message' => 'Razón social no proporcionada']);
    exit();
}

$stmtEmpresa = $conn->prepare("SELECT idEmp FROM empresas WHERE razon_social = ?");
$stmtEmpresa->bind_param("s", $razonSocial);
$stmtEmpresa->execute();
$resultEmpresa = $stmtEmpresa->get_result();

if ($resultEmpresa->num_rows > 0) {
    $row = $resultEmpresa->fetch_assoc();
    $idEmpresa = $row['idEmp'];

    $stmtMeses = $conn->prepare("SELECT idMes FROM pagos_empresas WHERE idEmp = ?");
    $stmtMeses->bind_param("i", $idEmpresa);
    $stmtMeses->execute();
    $resultMeses = $stmtMeses->get_result();

    $mesesPagados = [];
    while ($rowMeses = $resultMeses->fetch_assoc()) {
        $mesesPagados[] = $rowMeses['idMes'];
    }

    echo json_encode([
        'success' => true,
        'mesesPagados' => $mesesPagados
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Empresa no encontrada']);
}

$stmtEmpresa->close();
$stmtMeses->close();
$conn->close();
?>