<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include(__DIR__ . '/db.php');  

// Obtener los parámetros
$busqueda = $_GET['busqueda'] ?? null;
$tipoEntidad = $_GET['tipoEntidad'] ?? 'socios';

header('Content-Type: application/json');

// Validar si existe el parámetro de búsqueda
if ($busqueda) {
    // Verificar si la tabla de pagos existe
    $checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos'");
    $tienePagos = ($checkPagosTable->num_rows > 0);

    // Consulta SQL base
    $query = "
        SELECT 
            s.idSocios AS id,
            s.nombre,
            s.apellido,
            s.DNI,
            s.domicilio,
            s.numero,
            s.domicilio_2,
            s.observacion,
            s.localidad,
            s.telefono,
            s.email,
            c.Nombre_categoria AS categoria,
            c.Precio_Categoria AS precio_categoria,
            m.Medio_Pago AS medio_pago";

    // Agregar meses pagados si la tabla existe
    if ($tienePagos) {
        // Verificar el nombre correcto de la columna (idSocios)
        $query .= ",
            (SELECT GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ', ') 
             FROM pagos p WHERE p.idSocios = s.idSocios) as meses_pagados";
    }

    $query .= "
        FROM 
            socios s
        LEFT JOIN 
            categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN 
            mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE 
            (s.nombre LIKE ? OR s.apellido LIKE ?)
            AND s.flag = " . ($tipoEntidad === 'empresas' ? 1 : 0) . "
        ORDER BY 
            s.apellido ASC, s.nombre ASC";

    $stmt = $conn->prepare($query);
    if ($stmt) {
        // Agregar comodines "%" para búsqueda parcial
        $param = '%' . $busqueda . '%';
        $stmt->bind_param('ss', $param, $param);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $resultados = [];
            while ($row = $result->fetch_assoc()) {
                // Procesar meses pagados si existen
                if ($tienePagos && isset($row['meses_pagados'])) {
                    if (!empty($row['meses_pagados'])) {
                        $mesesNumeros = explode(', ', $row['meses_pagados']);
                        $mesesNombres = array_map(function($mes) {
                            $nombresMeses = [
                                1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
                                5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
                                9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
                            ];
                            return $nombresMeses[(int)$mes] ?? $mes;
                        }, $mesesNumeros);
                        $row['meses_pagados'] = implode(', ', $mesesNombres);
                    } else {
                        $row['meses_pagados'] = '-';
                    }
                } else {
                    $row['meses_pagados'] = null;
                }
                $resultados[] = $row;
            }

            echo json_encode($resultados);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "No se encontraron resultados"]);
        }

        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta", "error" => $conn->error]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Falta el parámetro de búsqueda"]);
}

$conn->close();
?>