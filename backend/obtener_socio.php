<?php
header("Access-Control-Allow-Origin: *"); // Permitir todas las solicitudes de cualquier origen
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Headers permitidos

include(__DIR__ . '/db.php');

$nombre = $_GET['nombre'] ?? null;
$apellido = $_GET['apellido'] ?? null;

header('Content-Type: application/json');

if ($nombre && $apellido) {
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
        s.domicilio_2, 
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
    if ($stmt) {
        $stmt->bind_param('ss', $nombre, $apellido);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $socio = $result->fetch_assoc();

            // Obtener todas las categorías disponibles
            $categoriasQuery = "SELECT idCategorias, Nombre_categoria FROM categorias";
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
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Faltan los parámetros nombre o apellido"]);
}

$conn->close();
?>
