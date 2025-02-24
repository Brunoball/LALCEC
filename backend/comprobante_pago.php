<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Incluir el archivo de conexión a la base de datos
include('db.php'); // Asegúrate de que la ruta sea correcta

$data = json_decode(file_get_contents("php://input"), true);
$nombre = $conn->real_escape_string($data["nombre"]);
$apellido = $conn->real_escape_string($data["apellido"]);

// Modificar la consulta para obtener el cobrador y el precio mensual
$query = "
    SELECT 
        socios.nombre, 
        socios.apellido, 
        socios.domicilio, 
        socios.numero, 
        categorias.Nombre_Categoria, 
        categorias.Precio_Categoria, 
        mediospago.Medio_Pago
    FROM socios
    LEFT JOIN categorias ON socios.idCategoria = categorias.idCategorias
    LEFT JOIN mediospago ON socios.idMedios_Pago = mediospago.idMedios_Pago
    WHERE socios.nombre = '$nombre' AND socios.apellido = '$apellido'
";

$result = $conn->query($query);

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    
    // Asignar valores en blanco en lugar de null si no existen
    $domicilio = isset($row["domicilio"]) ? $row["domicilio"] : "";
    $numero = isset($row["numero"]) ? $row["numero"] : "";
    $categoria = isset($row["Nombre_Categoria"]) ? $row["Nombre_Categoria"] : "";
    $precioCategoria = isset($row["Precio_Categoria"]) ? $row["Precio_Categoria"] : "";
    $cobrador = isset($row["Medio_Pago"]) ? $row["Medio_Pago"] : "";

    echo json_encode([
        "success" => true,
        "nombre" => $row["nombre"],
        "apellido" => $row["apellido"],
        "domicilio" => $domicilio, 
        "numero" => $numero, 
        "categoria" => $categoria,
        "precioCategoria" => $precioCategoria,
        "cobrador" => $cobrador
    ]);
} else {
    echo json_encode(["success" => false, "message" => "No se encontraron datos del socio"]);
}

$conn->close();
?>
