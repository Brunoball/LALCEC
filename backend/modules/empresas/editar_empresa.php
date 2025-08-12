<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once(__DIR__ . '/../../config/db.php');

$data = json_decode(file_get_contents("php://input"), true);

if ($data) {
    $razon_social = isset($data['razon_social']) ? strtoupper(trim($data['razon_social'])) : null;
    $idEmp = isset($data['idEmp']) ? intval($data['idEmp']) : null;
    $domicilio = isset($data['domicilio']) ? strtoupper(trim($data['domicilio'])) : null;
    $domicilio_2 = isset($data['domicilio_2']) ? strtoupper(trim($data['domicilio_2'])) : null;
    $telefono = isset($data['telefono']) ? strtoupper(trim($data['telefono'])) : null;
    $email = isset($data['email']) ? strtoupper(trim($data['email'])) : null;
    $observacion = isset($data['observacion']) ? strtoupper(trim($data['observacion'])) : null;
    $idCategoria = isset($data['idCategoria']) ? intval($data['idCategoria']) : null;
    $medioPago = isset($data['medioPago']) ? intval($data['medioPago']) : null;
    $cuit = isset($data['cuit']) ? strtoupper(trim($data['cuit'])) : null;
    $id_iva = isset($data['id_iva']) && $data['id_iva'] !== '' ? intval($data['id_iva']) : null;

    if (!$razon_social || !$idEmp) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Falta el dato obligatorio: razon_social o idEmp"]);
        exit();
    }

    if (strlen($razon_social) > 100) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "La razón social no puede superar los 100 caracteres"]);
        exit();
    }

    if ($domicilio && strlen($domicilio) > 100) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El domicilio no puede superar los 100 caracteres"]);
        exit();
    }

    if ($domicilio_2 && strlen($domicilio_2) > 100) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El domicilio alternativo no puede superar los 100 caracteres"]);
        exit();
    }

    if ($telefono && !preg_match('/^[0-9+\-\s()]{6,20}$/', $telefono)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El teléfono tiene un formato inválido"]);
        exit();
    }

    if ($email && !filter_var(strtolower($email), FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El email tiene un formato inválido"]);
        exit();
    }

    if ($cuit && !preg_match('/^[0-9]{2}-[0-9]{8}-[0-9]{1}$/', $cuit)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El CUIT debe tener el formato XX-XXXXXXXX-X"]);
        exit();
    }

    if (!is_null($id_iva) && !is_int($id_iva)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "El ID de IVA debe ser un número entero"]);
        exit();
    }

    if (!empty($cuit)) {
        $queryCheckCuit = "SELECT idEmp FROM empresas WHERE cuit = ? AND idEmp != ?";
        if ($stmtCheckCuit = $conn->prepare($queryCheckCuit)) {
            $stmtCheckCuit->bind_param('si', $cuit, $idEmp);
            $stmtCheckCuit->execute();
            $stmtCheckCuit->store_result();

            if ($stmtCheckCuit->num_rows > 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "El CUIT ya existe en otro registro"]);
                exit();
            }

            $stmtCheckCuit->close();
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al preparar la consulta de verificación de CUIT"]);
            exit();
        }
    }

    $query = "UPDATE empresas SET razon_social = ?, domicilio = ?, domicilio_2 = ?, telefono = ?, email = ?, observacion = ?, id_iva = ?";
    $params = [$razon_social, $domicilio, $domicilio_2, $telefono, $email, $observacion, $id_iva];
    $types = "sssssss";

    if (!empty($cuit)) {
        $query .= ", cuit = ?";
        $params[] = $cuit;
        $types .= "s";
    } else {
        $query .= ", cuit = NULL";
    }

    if (!empty($idCategoria)) {
        $query .= ", idCategorias = ?";
        $params[] = $idCategoria;
        $types .= "i";
    } else {
        $query .= ", idCategorias = NULL";
    }

    if (!empty($medioPago)) {
        $query .= ", idMedios_Pago = ?";
        $params[] = $medioPago;
        $types .= "i";
    } else {
        $query .= ", idMedios_Pago = NULL";
    }

    $query .= " WHERE idEmp = ?";
    $params[] = $idEmp;
    $types .= "i";

    if ($stmt = $conn->prepare($query)) {
        $stmt->bind_param($types, ...$params);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Empresa actualizada correctamente"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al actualizar la empresa"]);
        }
        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al preparar la consulta"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos no recibidos"]);
}

$conn->close();
?>
