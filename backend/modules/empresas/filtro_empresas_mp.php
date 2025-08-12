<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

require_once(__DIR__ . '/../../config/db.php');

// Configurar la codificación UTF-8
mysqli_set_charset($conn, "utf8");

// Verificar si la tabla de pagos_empresas existe
$checkPagosTable = $conn->query("SHOW TABLES LIKE 'pagos_empresas'");
$tienePagos = ($checkPagosTable->num_rows > 0);

// Determinar el nombre correcto de la columna de relación con empresas
$columnaEmpresaPagos = 'idEmp'; // Valor por defecto
if ($tienePagos) {
    // Verificar las columnas existentes en la tabla pagos_empresas
    $columnasPagos = $conn->query("SHOW COLUMNS FROM pagos_empresas");
    while ($columna = $columnasPagos->fetch_assoc()) {
        if (in_array($columna['Field'], ['idEmp', 'idEmpresa', 'empresa_id'])) {
            $columnaEmpresaPagos = $columna['Field'];
            break;
        }
    }
}

// Obtener el medio de pago y el tipo de entidad desde la URL
$medio = $_GET['medio'] ?? '';
$tipo = $_GET['tipo'] ?? 'empresas'; // Default a 'empresas'

if (!$medio) {
    echo json_encode(["error" => "El parámetro 'medio' es requerido."]);
    exit;
}

// Determinar el valor de flag según el tipo de entidad
$flag = ($tipo === 'empresas') ? 1 : 0; // Ajusta el flag según tu lógica

// Obtener el idMedios_Pago correspondiente al nombre del medio de pago
$queryMedio = "SELECT idMedios_Pago, Medio_Pago FROM mediospago WHERE Medio_Pago = ?";
$stmtMedio = $conn->prepare($queryMedio);

if (!$stmtMedio) {
    echo json_encode(["error" => "Error en la consulta de medios de pago: " . $conn->error]);
    exit;
}

$stmtMedio->bind_param('s', $medio);
$stmtMedio->execute();
$resultMedio = $stmtMedio->get_result();

if ($resultMedio->num_rows === 0) {
    echo json_encode(["error" => "No se encontró el medio de pago especificado."]);
    $stmtMedio->close();
    $conn->close();
    exit;
}

$rowMedio = $resultMedio->fetch_assoc();
$idMediosPago = $rowMedio['idMedios_Pago'];
$stmtMedio->close();

// Consulta SQL para obtener las empresas con la categoría, precio de la categoría, medio de pago y descripción del IVA
$queryEmpresas = "
    SELECT 
        e.idEmp,
        e.razon_social,
        e.cuit,
        e.domicilio,
        e.domicilio_2,
        e.telefono,
        e.email,
        e.observacion,
        e.fechaunion AS Fechaunion,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago,
        i.descripcion AS descripcion_iva";

// Agregar meses pagados solo si la tabla de pagos_empresas existe
if ($tienePagos) {
    $queryEmpresas .= ",
        GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ', ') as meses_pagados";
}

$queryEmpresas .= "
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
    $queryEmpresas .= "
    LEFT JOIN
        pagos_empresas p ON e.idEmp = p.{$columnaEmpresaPagos}";
}

$queryEmpresas .= "
    WHERE 
        e.idMedios_Pago = ?
    GROUP BY
        e.idEmp
    ORDER BY 
        e.razon_social ASC";

$stmtEmpresas = $conn->prepare($queryEmpresas);
if (!$stmtEmpresas) {
    echo json_encode(["error" => "Error en la consulta de empresas: " . $conn->error]);
    exit;
}

$stmtEmpresas->bind_param('i', $idMediosPago);
$stmtEmpresas->execute();
$resultEmpresas = $stmtEmpresas->get_result();

$empresas = [];
while ($row = $resultEmpresas->fetch_assoc()) {
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

$stmtEmpresas->close();
$conn->close();

echo json_encode($empresas);
?>