<?php
header("Access-Control-Allow-Origin: *"); // Permitir todas las solicitudes de cualquier origen
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Métodos permitidos
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Headers permitidos

include(__DIR__ . '/db.php');

$busqueda = $_GET['busqueda'] ?? null;

header('Content-Type: application/json');

if ($busqueda) {
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
            m.Medio_Pago AS medio_pago
        FROM 
            socios s
        LEFT JOIN 
            categorias c ON s.idCategoria = c.idCategorias
        LEFT JOIN 
            mediospago m ON s.idMedios_Pago = m.IdMedios_pago
        WHERE 
            s.nombre LIKE ? OR s.apellido LIKE ?
        ORDER BY 
            s.apellido ASC, s.nombre ASC
    ";

    $stmt = $conn->prepare($query);
    if ($stmt) {
        // Agregar comodines "%" para búsqueda parcial
        $param = '%' . $busqueda . '%';
        $stmt->bind_param('ss', $param, $param);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $socios = [];
            while ($row = $result->fetch_assoc()) {
                $socios[] = $row;
            }

            echo json_encode($socios);
        } else {
            http_response_code(404);
        }

        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Falta el parámetro de búsqueda"]);
}

$conn->close();
?>
