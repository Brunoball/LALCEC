<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Incluir el archivo de conexión a la base de datos
include('db.php'); // Asegúrate de que la ruta sea correcta

// Obtener datos enviados por el cliente (en este caso, el nombre de la empresa)
$data = json_decode(file_get_contents("php://input"), true);
$razonSocial = $conn->real_escape_string($data["razonSocial"]);

// Modificar la consulta para obtener el domicilio, domicilio_2, categoria, cobrador y precio de la empresa
$query = "
    SELECT 
        empresas.razon_social, 
        empresas.domicilio, 
        empresas.domicilio_2, 
        categorias.Nombre_Categoria, 
        categorias.Precio_Categoria, 
        mediospago.Medio_Pago
    FROM empresas
    LEFT JOIN categorias ON empresas.idCategorias = categorias.idCategorias
    LEFT JOIN mediospago ON empresas.idMedios_Pago = mediospago.idMedios_Pago
    WHERE empresas.razon_social = '$razonSocial'
";

$result = $conn->query($query);

// Verificar si la consulta fue exitosa
if ($result === false) {
    echo json_encode(["success" => false, "message" => "Error en la consulta: " . $conn->error]);
    $conn->close();
    exit();
}

// Verificar si se encontraron resultados
if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    
    // Asignar valores en blanco en lugar de null si no existen
    $domicilio = isset($row["domicilio"]) ? $row["domicilio"] : "";
    $domicilio2 = isset($row["domicilio_2"]) ? $row["domicilio_2"] : "";
    $categoria = isset($row["Nombre_Categoria"]) ? $row["Nombre_Categoria"] : "";
    $precioCategoria = isset($row["Precio_Categoria"]) ? $row["Precio_Categoria"] : "";
    $cobrador = isset($row["Medio_Pago"]) ? $row["Medio_Pago"] : "";

    // Devolver los resultados como un JSON
    echo json_encode([
        "success" => true,
        "razonSocial" => $row["razon_social"],
        "domicilio" => $domicilio, 
        "domicilio_2" => $domicilio2, // Asegúrate de que este campo esté presente
        "categoria" => $categoria,
        "precioCategoria" => $precioCategoria,
        "cobrador" => $cobrador
    ]);
} else {
    echo json_encode(["success" => false, "message" => "No se encontraron datos de la empresa"]);
}

$conn->close();
?>
