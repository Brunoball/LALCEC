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

$data = json_decode(file_get_contents("php://input"), true);

if ($data) {
    // Convertir todos los campos a mayúsculas antes de procesarlos
    $idEmp = $data['idEmp'] ?? null;
    $razon_social = strtoupper($data['razon_social'] ?? '');
    $domicilio = strtoupper($data['domicilio'] ?? '');
    $telefono = strtoupper($data['telefono'] ?? '');
    $email = strtoupper($data['email'] ?? '');
    $observacion = strtoupper($data['observacion'] ?? '');
    $idCategoria = $data['idCategoria'] ?? null;
    $medioPago = $data['medioPago'] ?? null;
    $cuit = strtoupper($data['cuit'] ?? ''); // Convertir CUIT a mayúsculas
    $cond_iva = strtoupper($data['cond_iva'] ?? ''); // Convertir Condición de IVA a mayúsculas

    if ($idEmp && $razon_social && $domicilio && $telefono && $email && $idCategoria) {
        $query = "
            UPDATE empresas
            SET 
                razon_social = ?,
                domicilio = ?,
                telefono = ?,
                email = ?,
                observacion = ?,
                idCategorias = ?,
                idMedios_Pago = ?,
                cuit = ?, -- Nuevo campo CUIT
                cond_iva = ? -- Nuevo campo Condición de IVA
            WHERE 
                idEmp = ?
        ";

        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param(
                'ssssssissi',
                $razon_social,
                $domicilio,
                $telefono,
                $email,
                $observacion,
                $idCategoria,
                $medioPago,
                $cuit, // Nuevo campo CUIT
                $cond_iva, // Nuevo campo Condición de IVA
                $idEmp
            );

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

$conn->close();
?>