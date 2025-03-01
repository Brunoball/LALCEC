<?php
header('Content-Type: application/json'); // Establece el tipo de contenido como JSON
header('Access-Control-Allow-Origin: http://localhost:3000'); // Permite solicitudes desde el frontend
header('Access-Control-Allow-Methods: GET, POST, OPTIONS'); // Permite métodos específicos
header('Access-Control-Allow-Headers: Content-Type'); // Permite encabezados específicos

include(__DIR__ . '/db.php'); // Incluir la conexión a la base de datos

// Verificar la conexión
if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Conexión fallida: " . $conn->connect_error]));
}

// Verificar si se recibieron los parámetros 'idEmp' y 'razon_social' en la solicitud GET
if (isset($_GET['idEmp']) && isset($_GET['razon_social'])) {
    $idEmp = $_GET['idEmp']; // Obtener el ID de la empresa/socio a eliminar
    $razon_social = $_GET['razon_social']; // Obtener la razón social de la empresa/socio a eliminar

    // Eliminar los registros dependientes en la tabla 'pagos_empresas'
    $deletePagosQuery = "DELETE FROM pagos_empresas WHERE idEmp = ?";
    $stmtDeletePagos = $conn->prepare($deletePagosQuery);

    if ($stmtDeletePagos) {
        $stmtDeletePagos->bind_param("i", $idEmp); // Vincular el parámetro
        $stmtDeletePagos->execute(); // Ejecutar la consulta
        $stmtDeletePagos->close(); // Cerrar la declaración
    }

    // Preparar la consulta SQL para eliminar la empresa/socio
    $sql = "DELETE FROM empresas WHERE idEmp = ? AND razon_social = ?";
    $stmt = $conn->prepare($sql);

    if ($stmt) {
        // Vincular los parámetros
        $stmt->bind_param("is", $idEmp, $razon_social);

        // Ejecutar la consulta
        if ($stmt->execute()) {
            // Verificar si se eliminó alguna fila
            if ($stmt->affected_rows > 0) {
                echo json_encode(["success" => true]); // Solo devuelve éxito
            } else {
                echo json_encode(["success" => false, "message" => "No se encontró la empresa/socio con el ID y razón social proporcionados"]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Error al ejecutar la consulta: " . $stmt->error]);
        }

        // Cerrar la declaración
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Error al preparar la consulta: " . $conn->error]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Parámetros 'idEmp' y 'razon_social' no proporcionados"]);
}

// Cerrar la conexión
$conn->close();
?>
