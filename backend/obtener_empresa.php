<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include(__DIR__ . '/db.php');

// Recuperar el parámetro 'razon_social' de la URL
$razon_social = $_GET['razon_social'] ?? null;

header('Content-Type: application/json');

if ($razon_social) {
    // Consulta para obtener los detalles de la empresa según 'razon_social'
    $query = "
        SELECT 
            e.idEmp,
            e.razon_social,
            e.domicilio,
            e.telefono,
            e.email,
            e.observacion,
            e.idCategorias,
            c.Nombre_categoria AS categoria,
            c.Precio_Categoria AS precio_categoria -- Agregar el precio de la categoría
        FROM 
            empresas e
        LEFT JOIN 
            categorias c ON e.idCategorias = c.idCategorias
        WHERE 
            e.razon_social = ?
    ";

    // Preparar la consulta
    $stmt = $conn->prepare($query);
    if ($stmt) {
        // Vincular el parámetro de la consulta
        $stmt->bind_param('s', $razon_social);
        $stmt->execute();
        $result = $stmt->get_result();

        // Si se encuentra la empresa
        if ($result->num_rows > 0) {
            $empresa = $result->fetch_assoc();

            // Obtener todas las categorías disponibles, incluyendo el precio
            $categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias";
            $categoriasResult = $conn->query($categoriasQuery);
            $categorias = [];
            while ($row = $categoriasResult->fetch_assoc()) {
                $categorias[] = $row;
            }

            // Agregar las categorías y el precio de la categoría al resultado de la empresa
            $empresa['categorias'] = $categorias;
            // No es necesario agregar 'precio_categoria' aquí ya que ya está en la consulta inicial

            // Devolver los datos de la empresa en formato JSON
            echo json_encode($empresa);
        } else {
            // Si no se encuentra la empresa, devolver un mensaje de error
            http_response_code(404);
            echo json_encode(["message" => "Empresa no encontrada"]);
        }

        $stmt->close();
    } else {
        // Si ocurre un error al preparar la consulta, devolver un mensaje de error
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta"]);
    }
} else {
    // Si falta el parámetro 'razon_social', devolver un mensaje de error
    http_response_code(400);
    echo json_encode(["message" => "Falta el parámetro razon_social"]);
}

// Cerrar la conexión a la base de datos
$conn->close();
?>
