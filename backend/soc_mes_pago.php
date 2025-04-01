<?php
// Archivo: soc_mes_pago.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Manejar la solicitud de preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include('db.php');

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode([
        'success' => false,
        'error' => "Error de conexión: " . $conn->connect_error
    ]));
}

try {
    // Obtener el mes actual (1-12)
    $mesActual = (int)date('n');
    $anioActual = (int)date('Y');

    // Consulta optimizada que obtiene socios y sus pagos
    $query = "SELECT 
                s.idSocios, 
                s.Nombre, 
                s.Apellido, 
                s.categoria,
                s.precio_categoria,
                s.medio_pago,
                s.domicilio_2,
                s.observacion,
                GROUP_CONCAT(DISTINCT p.idMes ORDER BY p.idMes SEPARATOR ',') AS mesesPagados
              FROM socios s
              LEFT JOIN pagos p ON s.idSocios = p.idSocios AND p.anio = ?
              GROUP BY s.idSocios";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $anioActual);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if (!$result) {
        throw new Exception("Error en la consulta: " . $conn->error);
    }

    $sociosConPagos = [];
    
    while ($row = $result->fetch_assoc()) {
        $mesesPagados = !empty($row['mesesPagados']) ? 
            array_map('intval', explode(',', $row['mesesPagados'])) : 
            [];
        
        // Calcular meses adeudados
        $mesesAdeudados = [];
        for ($mes = 1; $mes <= $mesActual; $mes++) {
            if (!in_array($mes, $mesesPagados)) {
                $mesesAdeudados[] = $mes;
            }
        }
        
        $totalAdeudado = count($mesesAdeudados);
        
        // Determinar estado de pago
        $estadoPago = 'al-dia'; // verde
        if ($totalAdeudado > 0 && $totalAdeudado <= 2) {
            $estadoPago = 'atrasado-1-2'; // amarillo
        } elseif ($totalAdeudado >= 3) {
            $estadoPago = 'atrasado-3-mas'; // rojo
        }
        
        $sociosConPagos[] = [
            'idSocios' => (int)$row['idSocios'],
            'nombre' => trim($row['Nombre']),
            'apellido' => trim($row['Apellido']),
            'categoria' => $row['categoria'],
            'precio_categoria' => $row['precio_categoria'],
            'medio_pago' => $row['medio_pago'],
            'domicilio_2' => $row['domicilio_2'],
            'observacion' => $row['observacion'],
            'mesesPagados' => $mesesPagados,
            'mesesAdeudados' => $mesesAdeudados,
            'totalAdeudado' => $totalAdeudado,
            'estadoPago' => $estadoPago
        ];
    }

    if (empty($sociosConPagos)) {
        echo json_encode([
            'success' => false,
            'error' => 'No se encontraron socios con datos de pagos'
        ]);
        exit();
    }

    // Devolver respuesta exitosa
    echo json_encode([
        'success' => true,
        'data' => $sociosConPagos,
        'count' => count($sociosConPagos),
        'mesActual' => $mesActual,
        'anioActual' => $anioActual,
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    // Manejo centralizado de errores
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} finally {
    // Cerrar conexión si está abierta
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
?>