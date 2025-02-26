<?php
header("Access-Control-Allow-Origin: *"); // Permitir todas las solicitudes de cualquier origen
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Headers permitidos

include(__DIR__ . '/db.php');

// Obtener los parámetros
$busqueda = $_GET['busqueda'] ?? null; // Buscar por nombre o apellido
$tipoEntidad = $_GET['tipoEntidad'] ?? null; // El tipo de entidad: 'socios' o 'empresas'

header('Content-Type: application/json');

// Validar si existe el parámetro de búsqueda
if ($busqueda) {
    // Establecer el valor de flag según el tipo de entidad
    $flagCondition = '';
    if ($tipoEntidad === 'empresas') {
        $flagValue = 1; // Empresas
    } else if ($tipoEntidad === 'socios') {
        $flagValue = 0; // Socios
    } else {
        // Si el tipo de entidad no es válido, se responde con error
        http_response_code(400);
        echo json_encode(["message" => "Tipo de entidad inválido. Use 'socios' o 'empresas'."]);
        exit;
    }

    // Depuración: Verificar los valores recibidos
    // echo json_encode(['busqueda' => $busqueda, 'tipoEntidad' => $tipoEntidad]);

    // Consulta SQL para obtener socios o empresas según el tipo de búsqueda
    $query = "
        SELECT 
            s.idSocios AS id,
            s.nombre,
            s.apellido,
            s.DNI,
            s.domicilio,
            s.numero,
            s.observacion,
            s.localidad,
            s.telefono,
            s.email,
            s.idCategoria, 
            s.idMedios_Pago,
            c.Nombre_categoria AS categoria,
            c.Precio_Categoria AS precio_categoria,
            m.Medio_Pago AS medio_pago,
            s.flag
        FROM 
            socios s
        LEFT JOIN 
            categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN 
            mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE 
            (s.nombre LIKE ? OR s.apellido LIKE ?)
            AND s.flag = ?
        ORDER BY 
            s.apellido ASC, s.nombre ASC
    ";

    $stmt = $conn->prepare($query);
    if ($stmt) {
        // Agregar comodines "%" para búsqueda parcial
        $param = '%' . $busqueda . '%';
        $stmt->bind_param('ssi', $param, $param, $flagValue); // Pasar flag directamente
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $resultados = [];
            while ($row = $result->fetch_assoc()) {
                $resultados[] = $row;
            }

            echo json_encode($resultados);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "No se encontraron resultados"]);
        }

        $stmt->close();
    } else {
        // Depuración: Verificar el error en la consulta
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta", "error" => $conn->error]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Falta el parámetro de búsqueda"]);
}

$conn->close();
?>
