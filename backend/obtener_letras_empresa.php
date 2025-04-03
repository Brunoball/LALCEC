<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

include(__DIR__ . '/db.php');

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(["error" => "Conexión fallida: " . $conn->connect_error]));
}

// Verificar si la tabla de pagos_empresas existe
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos_empresas'");
$tienePagos = ($checkPagosTable->num_rows > 0);

// Determinar el nombre correcto de la columna de relación con empresas
$columnaEmpresaPagos = 'idEmp'; // Valor por defecto
if ($tienePagos) {
    $columnasPagos = $conn->query("SHOW COLUMNS FROM pagos_empresas");
    while ($columna = $columnasPagos->fetch_assoc()) {
        if (in_array($columna['Field'], ['idEmp', 'idEmpresa', 'empresa_id'])) {
            $columnaEmpresaPagos = $columna['Field'];
            break;
        }
    }
}

// Obtener la letra y sanitizar
$letra = isset($_GET["letra"]) ? $conn->real_escape_string($_GET["letra"]) : "";

// Validar que la letra no esté vacía
if (empty($letra)) {
    echo json_encode([]);
    exit();
}

// Consulta SQL para obtener empresas cuyo nombre comience con la letra dada
$query = "
    SELECT 
        e.idEmp,
        e.razon_social,
        e.cuit,
        e.domicilio,
        e.domicilio_2,
        e.telefono,
        e.email,
        e.observacion,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago,
        i.descripcion AS descripcion_iva";

// Agregar meses pagados solo si la tabla de pagos_empresas existe
if ($tienePagos) {
    $query .= ",
        GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ', ') as meses_pagados";
}

$query .= "
    FROM 
        empresas e
    LEFT JOIN 
        categorias c ON e.idCategorias = c.idCategorias
    LEFT JOIN 
        mediospago m ON e.idMedios_Pago = m.IdMedios_pago
    LEFT JOIN 
        condicional_iva i ON e.id_iva = i.id_iva";

// Agregar JOIN con pagos_empresas solo si la tabla existe
if ($tienePagos) {
    $query .= "
    LEFT JOIN
        pagos_empresas p ON e.idEmp = p.{$columnaEmpresaPagos}";
}

$query .= "
    WHERE 
        e.razon_social LIKE ?
    GROUP BY
        e.idEmp
    ORDER BY 
        e.razon_social ASC";

$stmt = $conn->prepare($query);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "Error en la preparación de la consulta: " . $conn->error]);
    exit;
}

// Agregar comodines "%" para búsqueda por letra inicial
$param = $letra . '%';
$stmt->bind_param('s', $param);
$stmt->execute();
$result = $stmt->get_result();

$empresas = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Procesar meses pagados si existen
        if ($tienePagos) {
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
            $row['meses_pagados'] = 'No disponible';
        }
        $empresas[] = $row;
    }
}

$stmt->close();
$conn->close();

// Devolver los resultados en formato JSON
echo json_encode($empresas);
?>