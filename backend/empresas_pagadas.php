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
    SELECT DISTINCT empresas.idEmp, 
                    empresas.razon_social, 
                    empresas.domicilio, 
                    categorias.Nombre_Categoria AS categoria
    FROM pagos_empresas
    JOIN empresas ON pagos_empresas.idEmp = empresas.idEmp
    LEFT JOIN categorias ON empresas.idCategoria = categorias.idCategorias
    WHERE pagos_empresas.idMes = '$idMes'
    GROUP BY empresas.idEmp
    ORDER BY empresas.razon_social ASC
";

$result = $conn->query($sql);

$empresasPagadas = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $empresasPagadas[] = $row;
    }
}

echo json_encode($empresasPagadas);

$conn->close();
?>