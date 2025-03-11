<?php
// Archivo: obtener_meses_pagos_soc.php
header("Access-Control-Allow-Origin: http://localhost:3003"); // Permite solicitudes desde el frontend
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type"); // Encabezados permitidos


// Manejar la solicitud de preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include('db.php');

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => "Connection failed: " . $conn->connect_error]));
}

// Obtener los datos enviados desde el frontend
$data = json_decode(file_get_contents('php://input'), true);
$nombre = $data['nombre'] ?? null;
$apellido = $data['apellido'] ?? null;

if (!$nombre || !$apellido) {
    echo json_encode(['success' => false, 'message' => 'Nombre y apellido no proporcionados']);
    exit();
}

// Obtener el ID del socio a partir del nombre y apellido
$stmtSocio = $conn->prepare("SELECT idSocios FROM socios WHERE Nombre = ? AND Apellido = ?");
$stmtSocio->bind_param("ss", $nombre, $apellido);
$stmtSocio->execute();
$resultSocio = $stmtSocio->get_result();

if ($resultSocio->num_rows > 0) {
    // Si el socio fue encontrado, obtener el idSocio
    $row = $resultSocio->fetch_assoc();
    $idSocio = $row['idSocios'];

    // Consulta para obtener los meses pagados por el socio en la tabla pagos
    $stmtMeses = $conn->prepare("SELECT idMes FROM pagos WHERE idSocios = ?");
    $stmtMeses->bind_param("i", $idSocio);
    $stmtMeses->execute();
    $resultMeses = $stmtMeses->get_result();

    // Inicializar un array para almacenar los meses pagados
    $mesesPagados = [];
    while ($rowMeses = $resultMeses->fetch_assoc()) {
        $mesesPagados[] = $rowMeses['idMes']; // Guardar solo el idMes
    }

    // Crear el array de todos los meses con nombres
    $meses = [];
    for ($i = 1; $i <= 12; $i++) {
        $meses[] = [
            'id' => $i,
            'nombre' => (new DateTime("2020-$i-01"))->format('F')
        ];
    }

    // Retornar los meses pagados y la lista completa de meses
    echo json_encode([
        'success' => true,
        'mesesPagados' => $mesesPagados,
        'meses' => $meses // Devolvemos todos los meses
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Socio no encontrado']);
}

$stmtSocio->close();
$stmtMeses->close();
$conn->close();
?>
