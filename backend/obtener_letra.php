<?php
header("Access-Control-Allow-Origin: *"); // Permitir todas las solicitudes de cualquier origen
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Headers permitidos

include(__DIR__ . '/db.php');

// Obtener los parámetros de la URL
$nombre = trim($_GET['nombre'] ?? '');
$apellido = trim($_GET['apellido'] ?? '');
$letra = trim($_GET['letra'] ?? ''); // Nuevo parámetro para la letra

header('Content-Type: application/json');

// Verificar la conexión a la base de datos
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión a la base de datos"]);
    exit;
}

// Lógica para buscar por letra
if (!empty($letra)) {
    // Consulta SQL para obtener socios cuyo apellido comience con la letra especificada, ordenados por apellido y nombre
    $query = "
        SELECT 
            s.idSocios,
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
            c.Precio_Categoria AS precio_categoria,  -- Agregar el precio de la categoría
            m.Medio_Pago AS medio_pago
        FROM 
            socios s
        LEFT JOIN 
            categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN 
            mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE 
            s.apellido LIKE ?
        ORDER BY 
            s.apellido ASC, s.nombre ASC
    ";

    $letraLike = $letra . '%'; // Para buscar apellidos que comiencen con la letra
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta: " . $conn->error]);
        exit;
    }

    $stmt->bind_param('s', $letraLike);
    $stmt->execute();
    $result = $stmt->get_result();

    $socios = [];
    while ($row = $result->fetch_assoc()) {
        $socios[] = $row;
    }

    if (count($socios) > 0) {
        echo json_encode($socios);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "No se encontraron socios para la letra especificada"]);
    }

    $stmt->close();
}
// Lógica para buscar por nombre y apellido (existente)
else if (!empty($nombre) && !empty($apellido)) {
    $query = "
        SELECT 
            s.idSocios,
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
            c.Precio_Categoria AS precio_categoria,  -- Agregar el precio de la categoría
            m.Medio_Pago AS medio_pago
        FROM 
            socios s
        LEFT JOIN 
            categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN 
            mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE 
            s.nombre = ? AND s.apellido = ?
        ORDER BY
            s.apellido ASC, s.nombre ASC
    ";

    $stmt = $conn->prepare($query);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta: " . $conn->error]);
        exit;
    }

    $stmt->bind_param('ss', $nombre, $apellido);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $socio = $result->fetch_assoc();

        // Obtener todas las categorías disponibles
        $categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias";  // Incluir Precio_Categoria
        $categoriasResult = $conn->query($categoriasQuery);
        $categorias = [];
        while ($row = $categoriasResult->fetch_assoc()) {
            $categorias[] = $row;
        }

        // Obtener todos los medios de pago disponibles
        $mediosPagoQuery = "SELECT IdMedios_pago, Medio_Pago FROM mediospago";
        $mediosPagoResult = $conn->query($mediosPagoQuery);
        $mediosPago = [];
        while ($row = $mediosPagoResult->fetch_assoc()) {
            $mediosPago[] = $row;
        }

        // Agregar las listas de categorías y medios de pago al resultado
        $socio['categorias'] = $categorias;
        $socio['mediosPago'] = $mediosPago;

        echo json_encode($socio);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Socio no encontrado"]);
    }

    $stmt->close();
} else {
    http_response_code(400);
    echo json_encode(["message" => "Faltan parámetros válidos (nombre y apellido, o letra)"]);
}

$conn->close();
?>