<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once(__DIR__ . '/../../config/db.php');

$data = json_decode(file_get_contents("php://input"), true);

function send($ok, $msg, $code = 200) {
    http_response_code($code);
    echo json_encode(["success" => $ok, "message" => $msg]);
    exit();
}

function validarFecha($f) {
    if ($f === null || $f === '') return true;
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $f)) return false;
    [$y,$m,$d] = explode('-', $f);
    return checkdate((int)$m,(int)$d,(int)$y);
}

if ($data) {
    // Normalizaciones (evito upper para email)
    $razon_social = isset($data['razon_social']) ? strtoupper(trim($data['razon_social'])) : null;
    $idEmp        = isset($data['idEmp']) ? intval($data['idEmp']) : null;
    $domicilio    = isset($data['domicilio']) ? strtoupper(trim($data['domicilio'])) : null;
    $domicilio_2  = isset($data['domicilio_2']) ? strtoupper(trim($data['domicilio_2'])) : null;
    $telefono     = isset($data['telefono']) ? strtoupper(trim($data['telefono'])) : null;
    $email        = isset($data['email']) ? trim(strtolower($data['email'])) : null;
    $observacion  = isset($data['observacion']) ? strtoupper(trim($data['observacion'])) : null;
    $idCategoria  = isset($data['idCategoria']) && $data['idCategoria'] !== '' ? intval($data['idCategoria']) : null;
    $medioPago    = isset($data['medioPago']) && $data['medioPago'] !== '' ? intval($data['medioPago']) : null;
    $cuit         = isset($data['cuit']) ? strtoupper(trim($data['cuit'])) : null;
    $id_iva       = isset($data['id_iva']) && $data['id_iva'] !== '' ? intval($data['id_iva']) : null;

    // NUEVO: fecha de unión
    $fechaUnion   = isset($data['fechaUnion']) && $data['fechaUnion'] !== '' ? $data['fechaUnion'] : null;

    if (!$razon_social || !$idEmp) {
        send(false, "Falta el dato obligatorio: razon_social o idEmp", 400);
    }

    if (strlen($razon_social) > 100) {
        send(false, "La razón social no puede superar los 100 caracteres", 400);
    }
    if ($domicilio && strlen($domicilio) > 100) {
        send(false, "El domicilio no puede superar los 100 caracteres", 400);
    }
    if ($domicilio_2 && strlen($domicilio_2) > 100) {
        send(false, "El domicilio alternativo no puede superar los 100 caracteres", 400);
    }
    if ($telefono && !preg_match('/^[0-9+\-\s()]{6,20}$/', $telefono)) {
        send(false, "El teléfono tiene un formato inválido", 400);
    }
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send(false, "El email tiene un formato inválido", 400);
    }
    if ($cuit && !preg_match('/^[0-9]{2}-[0-9]{8}-[0-9]{1}$/', $cuit)) {
        send(false, "El CUIT debe tener el formato XX-XXXXXXXX-X", 400);
    }
    if ($fechaUnion !== null && !validarFecha($fechaUnion)) {
        send(false, "La fecha de unión debe tener el formato AAAA-MM-DD y ser válida", 400);
    }

    // CUIT único (si viene)
    if (!empty($cuit)) {
        $queryCheckCuit = "SELECT idEmp FROM empresas WHERE cuit = ? AND idEmp != ?";
        if ($stmtCheckCuit = $conn->prepare($queryCheckCuit)) {
            $stmtCheckCuit->bind_param('si', $cuit, $idEmp);
            $stmtCheckCuit->execute();
            $stmtCheckCuit->store_result();
            if ($stmtCheckCuit->num_rows > 0) {
                $stmtCheckCuit->close();
                send(false, "El CUIT ya existe en otro registro", 400);
            }
            $stmtCheckCuit->close();
        } else {
            send(false, "Error al preparar la verificación de CUIT", 500);
        }
    }

    // Armado dinámico del UPDATE
    $query  = "UPDATE empresas SET razon_social = ?, domicilio = ?, domicilio_2 = ?, telefono = ?, email = ?, observacion = ?, id_iva = ?";
    $params = [$razon_social, $domicilio, $domicilio_2, $telefono, $email, $observacion, $id_iva];
    $types  = "ssssssi"; // id_iva es entero

    if (!empty($cuit)) { $query .= ", cuit = ?"; $params[] = $cuit; $types .= "s"; }
    else               { $query .= ", cuit = NULL"; }

    if (!empty($idCategoria)) { $query .= ", idCategorias = ?"; $params[] = $idCategoria; $types .= "i"; }
    else                      { $query .= ", idCategorias = NULL"; }

    if (!empty($medioPago)) { $query .= ", idMedios_Pago = ?"; $params[] = $medioPago; $types .= "i"; }
    else                    { $query .= ", idMedios_Pago = NULL"; }

    // NUEVO: fechaunion
    if ($fechaUnion !== null && $fechaUnion !== '') {
        $query .= ", fechaunion = ?";
        $params[] = $fechaUnion;
        $types .= "s";
    } else {
        $query .= ", fechaunion = NULL";
    }

    $query .= " WHERE idEmp = ?";
    $params[] = $idEmp;
    $types .= "i";

    if ($stmt = $conn->prepare($query)) {
        $stmt->bind_param($types, ...$params);
        if ($stmt->execute()) {
            // Devolvemos success=true aunque no cambien filas (coincidía todo)
            echo json_encode(["success" => true, "message" => "Empresa actualizada correctamente"]);
        } else {
            send(false, "Error al actualizar la empresa", 500);
        }
        $stmt->close();
    } else {
        send(false, "Error al preparar la consulta", 500);
    }
} else {
    send(false, "Datos no recibidos", 400);
}

$conn->close();
