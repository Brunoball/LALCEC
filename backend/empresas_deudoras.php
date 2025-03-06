<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Incluir el archivo de conexión a la base de datos
include 'db.php';

$idMes = $_GET['mes'] ?? '';

if (empty($idMes)) {
    echo json_encode([]);
    exit;
}

// Consulta corregida para usar la tabla `pagos_empresas`
$sql = "
    SELECT empresas.idEmp, empresas.razon_social, empresas.domicilio, categorias.Nombre_Categoria AS categoria
    FROM empresas
    LEFT JOIN pagos_empresas ON empresas.idEmp = pagos_empresas.idEmp AND pagos_empresas.idMes = '$idMes'
    LEFT JOIN categorias ON empresas.idCategoria = categorias.idCategorias
    WHERE pagos_empresas.idPago IS NULL
    GROUP BY empresas.idEmp
    ORDER BY empresas.razon_social ASC
";

$result = $conn->query($sql);

$empresasDeudoras = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $empresasDeudoras[] = $row;
    }
}

echo json_encode($empresasDeudoras);

$conn->close();
?>