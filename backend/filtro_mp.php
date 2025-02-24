<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

include(__DIR__ . '/db.php');

// Configurar la codificación UTF-8
mysqli_set_charset($conn, "utf8");

// Obtener el medio de pago desde la URL
$medio = $_GET['medio'] ?? '';

if (!$medio) {
    echo json_encode(["error" => "El parámetro 'medio' es requerido."]);
    exit;
}

// Obtener el idMedios_Pago correspondiente al nombre del medio de pago
$queryMedio = "SELECT idMedios_Pago, Medio_Pago FROM mediospago WHERE Medio_Pago = ?";
$stmtMedio = $conn->prepare($queryMedio);

if (!$stmtMedio) {
    echo json_encode(["error" => "Error en la consulta de medios de pago: " . $conn->error]);
    exit;
}

$stmtMedio->bind_param('s', $medio);
$stmtMedio->execute();
$resultMedio = $stmtMedio->get_result();

if ($resultMedio->num_rows === 0) {
    echo json_encode(["error" => "No se encontró el medio de pago especificado."]);
    $stmtMedio->close();
    $conn->close();
    exit;
}

$rowMedio = $resultMedio->fetch_assoc();
$idMediosPago = $rowMedio['idMedios_Pago'];

$stmtMedio->close();

// Obtener los socios asociados a este idMedios_Pago, con la categoría y medio de pago
$querySocios = "
    SELECT 
        s.nombre, 
        s.apellido, 
        s.domicilio,
        s.numero,
        s.observacion,
        c.nombre_categoria AS categoria, 
        m.medio_pago 
    FROM 
        socios s
    LEFT JOIN 
        categorias c ON s.idcategoria = c.idcategorias
    LEFT JOIN 
        mediospago m ON s.idmedios_pago = m.idmedios_pago
    WHERE 
        s.idmedios_pago = ?
    ORDER BY 
        s.apellido ASC, s.nombre ASC
";
$stmtSocios = $conn->prepare($querySocios);

if (!$stmtSocios) {
    echo json_encode(["error" => "Error en la consulta de socios: " . $conn->error]);
    exit;
}

$stmtSocios->bind_param('i', $idMediosPago);
$stmtSocios->execute();
$resultSocios = $stmtSocios->get_result();

$socios = $resultSocios->fetch_all(MYSQLI_ASSOC);

$stmtSocios->close();
$conn->close();

echo json_encode($socios);
?>
