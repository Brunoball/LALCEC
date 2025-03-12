<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

include(__DIR__ . '/db.php');

// Configurar la codificación UTF-8
mysqli_set_charset($conn, "utf8");

// Obtener el medio de pago y el tipo de entidad desde la URL
$medio = $_GET['medio'] ?? '';
$tipo = $_GET['tipo'] ?? 'empresas'; // Default a 'empresas'

if (!$medio) {
    echo json_encode(["error" => "El parámetro 'medio' es requerido."]);
    exit;
}

// Determinar el valor de flag según el tipo de entidad
$flag = ($tipo === 'empresas') ? 1 : 0; // Ajusta el flag según tu lógica

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

// Consulta SQL para obtener las empresas con la categoría, precio de la categoría, medio de pago y descripción del IVA
$queryEmpresas = "
    SELECT 
        e.idEmp,
        e.razon_social,
        e.cuit,
        e.domicilio,
        e.domicilio_2,
        e.telefono,
        e.email,
        e.observacion,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago,
        i.descripcion AS descripcion_iva
    FROM 
        empresas e
    LEFT JOIN 
        categorias c ON e.idCategorias = c.idCategorias
    LEFT JOIN 
        mediospago m ON e.idMedios_Pago = m.IdMedios_pago
    LEFT JOIN 
        condicional_iva i ON e.id_iva = i.id_iva
    WHERE 
        e.idMedios_Pago = ?
    ORDER BY 
        e.razon_social ASC
";


$stmtEmpresas = $conn->prepare($queryEmpresas);
if (!$stmtEmpresas) {
    echo json_encode(["error" => "Error en la consulta de empresas: " . $conn->error]);
    exit;
}

$stmtEmpresas->bind_param('i', $idMediosPago); // Un parámetro
$stmtEmpresas->execute();
$resultEmpresas = $stmtEmpresas->get_result();
$empresas = $resultEmpresas->fetch_all(MYSQLI_ASSOC);

$stmtEmpresas->close();
$conn->close();

echo json_encode($empresas);
?>