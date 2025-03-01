<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include(__DIR__ . '/db.php');

$razon_social = $_GET['razon_social'] ?? null;

header('Content-Type: application/json');

if ($razon_social) {
    $query = "
        SELECT 
            e.idEmp,
            e.razon_social,
            e.domicilio,
            e.telefono,
            e.email,
            e.observacion,
            e.idCategorias,
            e.idMedios_Pago,
            e.cuit, -- Nuevo campo CUIT
            e.cond_iva, -- Nuevo campo Condición de IVA
            c.Nombre_categoria AS categoria,
            c.Precio_Categoria AS precio_categoria
        FROM 
            empresas e
        LEFT JOIN 
            categorias c ON e.idCategorias = c.idCategorias
        WHERE 
            e.razon_social = ?
    ";

    $stmt = $conn->prepare($query);
    if ($stmt) {
        $stmt->bind_param('s', $razon_social);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $empresa = $result->fetch_assoc();

            $categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias";
            $categoriasResult = $conn->query($categoriasQuery);
            $categorias = [];
            while ($row = $categoriasResult->fetch_assoc()) {
                $categorias[] = $row;
            }

            $mediosPagoQuery = "SELECT IdMedios_pago, Medio_Pago FROM mediospago";
            $mediosPagoResult = $conn->query($mediosPagoQuery);
            $mediosPago = [];
            while ($row = $mediosPagoResult->fetch_assoc()) {
                $mediosPago[] = $row;
            }

            $empresa['categorias'] = $categorias;
            $empresa['mediosPago'] = $mediosPago;

            echo json_encode($empresa);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Empresa no encontrada"]);
        }

        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Falta el parámetro razon_social"]);
}

$conn->close();
?>