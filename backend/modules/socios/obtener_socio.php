<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include_once(__DIR__ . '/../../config/db.php');
header('Content-Type: application/json');

$id = isset($_GET['id']) ? intval($_GET['id']) : null;
$nombre = $_GET['nombre'] ?? null;
$apellido = $_GET['apellido'] ?? null;

if ($id !== null) {
    $query = "
        SELECT 
            s.idSocios,
            s.nombre,
            s.apellido,
            s.DNI,
            s.domicilio,
            s.domicilio_2,
            s.numero,
            s.observacion,
            s.localidad,
            s.telefono,
            s.email,
            s.idCategoria, 
            s.idMedios_Pago,
            c.Nombre_categoria AS categoria,
            m.Medio_Pago AS medio_pago
        FROM 
            socios s
        LEFT JOIN 
            categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN 
            mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE 
            s.idSocios = ?
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $id);
} elseif ($nombre && $apellido) {
    $query = "
        SELECT 
            s.idSocios,
            s.nombre,
            s.apellido,
            s.DNI,
            s.domicilio,
            s.domicilio_2,
            s.numero,
            s.observacion,
            s.localidad,
            s.telefono,
            s.email,
            s.idCategoria, 
            s.idMedios_Pago,
            c.Nombre_categoria AS categoria,
            m.Medio_Pago AS medio_pago
        FROM 
            socios s
        LEFT JOIN 
            categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN 
            mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE 
            s.nombre = ? AND s.apellido = ?
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param('ss', $nombre, $apellido);
} else {
    http_response_code(400);
    echo json_encode(["message" => "Faltan parámetros requeridos"]);
    exit;
}

if ($stmt) {
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $socio = $result->fetch_assoc();

        // Obtener categorías
        $categoriasResult = $conn->query("SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias");
        $categorias = $categoriasResult->fetch_all(MYSQLI_ASSOC);

        // Obtener medios de pago
        $mediosPagoResult = $conn->query("SELECT IdMedios_pago, Medio_Pago FROM mediospago");
        $mediosPago = $mediosPagoResult->fetch_all(MYSQLI_ASSOC);

        $socio['categorias'] = $categorias;
        $socio['mediosPago'] = $mediosPago;

        echo json_encode($socio);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Socio no encontrado"]);
    }

    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error al preparar la consulta"]);
}

$conn->close();
?>
