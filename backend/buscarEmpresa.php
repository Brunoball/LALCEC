<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

include(__DIR__ . '/db.php');

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode(["error" => "Conexión fallida: " . $conn->connect_error]));
}

// Verificar si se ha recibido el parámetro 'busqueda'
$busqueda = isset($_GET["busqueda"]) ? $conn->real_escape_string($_GET["busqueda"]) : "";

// Si la búsqueda está vacía, retornar un array vacío
if (empty($busqueda)) {
    echo json_encode([]);
    exit();
}

// Consulta SQL para buscar en la tabla 'empresas' y obtener la descripción del 'id_iva'
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
        e.idCategorias AS idCategoria, 
        e.idMedios_Pago,
        c.Nombre_categoria AS categoria,
        c.Precio_Categoria AS precio_categoria,
        m.Medio_Pago AS medio_pago,
        e.id_iva,
        i.descripcion AS descripcion_iva
    FROM 
        empresas e
    LEFT JOIN 
        categorias c ON e.idCategorias = c.idCategorias
    LEFT JOIN 
        mediospago m ON e.idMedios_Pago = m.IdMedios_pago
    LEFT JOIN 
        condicional_iva i ON e.id_iva = i.id_iva
    WHERE 
        e.razon_social LIKE ?
    ORDER BY 
        e.razon_social ASC
";

// Preparar la consulta
$stmt = $conn->prepare($query);
if ($stmt) {
    // Agregar comodines "%" para búsqueda parcial
    $param = '%' . $busqueda . '%';
    $stmt->bind_param('s', $param);
    $stmt->execute();
    $result = $stmt->get_result();

    $empresas = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $empresas[] = $row;
        }
    }

    // Devolver los resultados en formato JSON
    echo json_encode($empresas);

    $stmt->close();
} else {
    // Si hay un error en la preparación de la consulta
    http_response_code(500);
    echo json_encode(["message" => "Error al preparar la consulta", "error" => $conn->error]);
}

// Cerrar conexión
$conn->close();
?>