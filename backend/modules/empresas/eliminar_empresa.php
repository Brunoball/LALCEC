<?php
header('Content-Type: application/json'); // Establece el tipo de contenido como JSON
header('Access-Control-Allow-Origin: http://localhost:3000'); // Permite solicitudes desde el frontend
header('Access-Control-Allow-Methods: GET, POST, OPTIONS'); // Permite métodos específicos
header('Access-Control-Allow-Headers: Content-Type'); // Permite encabezados específicos

require_once(__DIR__ . '/../../config/db.php');

// Verificar la conexión
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Conexión fallida: " . $conn->connect_error]);
    exit;
}

// Verificar si se recibieron los parámetros 'idEmp' y 'razon_social' en la solicitud GET
if (!isset($_GET['idEmp']) || !isset($_GET['razon_social'])) {
    echo json_encode(["success" => false, "message" => "Parámetros 'idEmp' y 'razon_social' no proporcionados"]);
    exit;
}

$idEmp = $_GET['idEmp'];
$razon_social = $_GET['razon_social'];

// Iniciar transacción para evitar inconsistencias
$conn->begin_transaction();

try {
    // Eliminar los registros dependientes en la tabla 'pagos_empresas'
    $deletePagosQuery = "DELETE FROM pagos_empresas WHERE idEmp = ?";
    $stmtDeletePagos = $conn->prepare($deletePagosQuery);
    if ($stmtDeletePagos) {
        $stmtDeletePagos->bind_param("i", $idEmp);
        $stmtDeletePagos->execute();
        $stmtDeletePagos->close();
    }

    // Eliminar la empresa/socio
    $deleteEmpresaQuery = "DELETE FROM empresas WHERE idEmp = ? AND razon_social = ?";
    $stmt = $conn->prepare($deleteEmpresaQuery);
    
    if (!$stmt) {
        throw new Exception("Error al preparar la consulta: " . $conn->error);
    }

    $stmt->bind_param("is", $idEmp, $razon_social);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $conn->commit(); // Confirmar la transacción
        echo json_encode(["success" => true, "message" => "Empresa eliminada correctamente"]);
    } else {
        throw new Exception("No se encontró la empresa/socio con el ID y razón social proporcionados");
    }

    $stmt->close();
} catch (Exception $e) {
    $conn->rollback(); // Revertir cambios en caso de error
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

$conn->close();
?>
