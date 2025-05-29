<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Incluir el archivo de conexión a la base de datos
include('db.php');

// Establecer manejo de errores más explícitos
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Conexión fallida: " . $conn->connect_error]);
    exit();
}

// Consulta para obtener todas las empresas con información adicional
$query = "
    SELECT 
        empresas.razon_social AS nombre,
        empresas.cuit,
        empresas.id_iva,
        empresas.domicilio,
        empresas.domicilio_2,  -- Agregamos domicilio_2 aquí
        empresas.telefono,
        empresas.email,
        categorias.Nombre_Categoria AS categoria,
        categorias.Precio_Categoria AS precioCategoria,
        mediospago.Medio_Pago AS cobrador
    FROM empresas
    LEFT JOIN categorias ON empresas.idCategorias = categorias.idCategorias
    LEFT JOIN mediospago ON empresas.idMedios_Pago = mediospago.idMedios_Pago
    ORDER BY empresas.razon_social ASC
";

$result = $conn->query($query);

if ($result) {
    if ($result->num_rows > 0) {
        $empresas = [];

        while ($row = $result->fetch_assoc()) {
            $empresas[] = [
                "nombre" => $row["nombre"] ?? "",
                "cuit" => $row["cuit"] ?? "",
                "id_iva" => $row["id_iva"] ?? "",
                "domicilio" => $row["domicilio"] ?? "",
                "domicilio_2" => $row["domicilio_2"] ?? "",  // Agregamos domicilio_2 en el array
                "telefono" => $row["telefono"] ?? "",
                "email" => $row["email"] ?? "",
                "categoria" => $row["categoria"] ?? "",
                "precioCategoria" => $row["precioCategoria"] ?? "",
                "cobrador" => $row["cobrador"] ?? ""
            ];
        }

        echo json_encode(["success" => true, "empresas" => $empresas]);
    } else {
        echo json_encode(["success" => false, "message" => "No se encontraron empresas"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Error en la consulta: " . $conn->error]);
}

$conn->close();
?>
