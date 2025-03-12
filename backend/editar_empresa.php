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
    $razon_social = isset($data['razon_social']) ? strtoupper($data['razon_social']) : null;
    $idEmp = isset($data['idEmp']) ? $data['idEmp'] : null;
    $domicilio = isset($data['domicilio']) ? strtoupper($data['domicilio']) : null;
    $domicilio_2 = isset($data['domicilio_2']) ? strtoupper($data['domicilio_2']) : null;
    $telefono = isset($data['telefono']) ? strtoupper($data['telefono']) : null;
    $email = isset($data['email']) ? strtoupper($data['email']) : null;
    $observacion = isset($data['observacion']) ? strtoupper($data['observacion']) : null;
    $idCategoria = isset($data['idCategoria']) ? $data['idCategoria'] : null; // Opcional
    $medioPago = isset($data['medioPago']) ? $data['medioPago'] : null; // Opcional
    $cuit = isset($data['cuit']) && !empty(trim($data['cuit'])) ? strtoupper($data['cuit']) : null; // Opcional
    $id_iva = isset($data['id_iva']) && $data['id_iva'] !== '' ? $data['id_iva'] : null;

    // Validar que el campo obligatorio razon_social esté presente
    if ($razon_social && $idEmp) {
        // Verificar si el CUIT ya existe en otro registro (solo si no está vacío)
        if (!empty($cuit)) {
            $queryCheckCuit = "SELECT idEmp FROM empresas WHERE cuit = ? AND idEmp != ?";
            if ($stmtCheckCuit = $conn->prepare($queryCheckCuit)) {
                $stmtCheckCuit->bind_param('si', $cuit, $idEmp);
                $stmtCheckCuit->execute();
                $stmtCheckCuit->store_result();

                if ($stmtCheckCuit->num_rows > 0) {
                    http_response_code(400);
                    echo json_encode(["message" => "El CUIT ya existe en otro registro"]);
                    exit();
                }

                $stmtCheckCuit->close();
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al preparar la consulta de verificación de CUIT"]);
                exit();
            }
        }

        // Construir la consulta SQL dinámicamente
        $query = "UPDATE empresas SET razon_social = ?, domicilio = ?, domicilio_2 = ?, telefono = ?, email = ?, observacion = ?, id_iva = ?";

        // Parámetros y tipos de datos
        $params = [$razon_social, $domicilio, $domicilio_2, $telefono, $email, $observacion, $id_iva];
        $types = "sssssss";

        // Agregar cuit solo si no es nulo
        if (!empty($cuit)) {
            $query .= ", cuit = ?";
            $params[] = $cuit;
            $types .= "s";
        } else {
            $query .= ", cuit = NULL"; // Forzar NULL si está vacío
        }

        // Agregar idCategoria solo si no es nulo
        if (!empty($idCategoria)) {
            $query .= ", idCategorias = ?";
            $params[] = $idCategoria;
            $types .= "i";
        } else {
            $query .= ", idCategorias = NULL"; // Forzar NULL si está vacío
        }

        // Agregar medioPago solo si no es nulo
        if (!empty($medioPago)) {
            $query .= ", idMedios_Pago = ?";
            $params[] = $medioPago;
            $types .= "i";
        } else {
            $query .= ", idMedios_Pago = NULL"; // Forzar NULL si está vacío
        }

        $query .= " WHERE idEmp = ?";
        $params[] = $idEmp;
        $types .= "i";

        // Preparar la consulta
        if ($stmt = $conn->prepare($query)) {
            // Vincular parámetros dinámicamente
            $stmt->bind_param($types, ...$params);

            // Ejecutar la consulta
            if ($stmt->execute()) {
                echo json_encode(["message" => "Empresa actualizada correctamente"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al actualizar la empresa"]);
            }

            // Cerrar la declaración
            $stmt->close();
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al preparar la consulta"]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Falta el dato obligatorio: razon_social o idEmp"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Datos no recibidos"]);
}

// Cerrar la conexión
$conn->close();
?>
