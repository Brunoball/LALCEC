<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Manejar la solicitud de preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include(__DIR__ . '/db.php');

// Obtener datos JSON desde el cuerpo de la solicitud
$data = json_decode(file_get_contents("php://input"), true);

// Verificar si los datos están presentes
if ($data) {
    // Convertir todos los campos a mayúsculas antes de procesarlos
    $idEmp = isset($data['idEmp']) ? $data['idEmp'] : null;
    $razon_social = isset($data['razon_social']) ? strtoupper($data['razon_social']) : null;
    $domicilio = isset($data['domicilio']) ? strtoupper($data['domicilio']) : null;
    $telefono = isset($data['telefono']) ? strtoupper($data['telefono']) : null;
    $email = isset($data['email']) ? strtoupper($data['email']) : null;
    $observacion = isset($data['observacion']) ? strtoupper($data['observacion']) : null;
    $idCategoria = isset($data['idCategoria']) ? $data['idCategoria'] : null;
    $medioPago = isset($data['medioPago']) ? $data['medioPago'] : null;
    $cuit = isset($data['cuit']) ? strtoupper($data['cuit']) : null;
    $cond_iva = isset($data['cond_iva']) ? strtoupper($data['cond_iva']) : null;

    // Validar que los campos obligatorios estén presentes
    if ($idEmp && $razon_social && $domicilio && $telefono && $email) {
        // Construir la consulta SQL dinámicamente
        $query = "
            UPDATE empresas
            SET 
                razon_social = ?,
                domicilio = ?,
                telefono = ?,
                email = ?,
                observacion = ?,
                cuit = ?,
                cond_iva = ?
        ";

        // Si idCategoria se recibe, incluirlo en la consulta
        if ($idCategoria) {
            $query .= ", idCategorias = ?";
        }

        $query .= " WHERE idEmp = ?";

        // Preparar la consulta
        if ($stmt = $conn->prepare($query)) {
            // Vincular parámetros según los campos que se recibieron
            if ($idCategoria) {
                $stmt->bind_param(
                    'sssssssii',
                    $razon_social,
                    $domicilio,
                    $telefono,
                    $email,
                    $observacion,
                    $cuit,
                    $cond_iva,
                    $idCategoria,
                    $idEmp
                );
            } else {
                $stmt->bind_param(
                    'sssssssi',
                    $razon_social,
                    $domicilio,
                    $telefono,
                    $email,
                    $observacion,
                    $cuit,
                    $cond_iva,
                    $idEmp
                );
            }

            // Ejecutar la consulta
            if ($stmt->execute()) {
                echo json_encode(["message" => "Empresa actualizada correctamente"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al actualizar la empresa"]);
            }

            $stmt->close();
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al preparar la consulta"]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Faltan datos obligatorios"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Datos no recibidos"]);
}

// Cerrar la conexión
$conn->close();
?>