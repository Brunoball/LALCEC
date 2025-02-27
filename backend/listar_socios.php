<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Incluir el archivo de conexión a la base de datos
include('db.php'); // Asegúrate de que la ruta sea correcta

// Consulta para obtener todos los socios junto con la información adicional
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
";

$result = $conn->query($query);

// Comprobamos si se han encontrado socios
if ($result) {
    if ($result->num_rows > 0) {
        $socios = [];

        // Recorrer todos los socios y agregar los datos en un array
        while ($row = $result->fetch_assoc()) {
            // Asignar valores en blanco si son null
            $nombre = $row["nombre"] ?? "";
            $apellido = $row["apellido"] ?? "";
            $domicilio = $row["domicilio"] ?? "";
            $numero = $row["numero"] ?? "";
            $categoria = $row["Nombre_Categoria"] ?? "";
            $precioCategoria = $row["Precio_Categoria"] ?? "";
            $cobrador = $row["Medio_Pago"] ?? "";

            // Crear un comprobante para cada socio
            $comprobante = [
                "nombre" => $nombre,
                "apellido" => $apellido,
                "domicilio" => $domicilio, 
                "numero" => $numero, 
                "categoria" => $categoria,
                "precioCategoria" => $precioCategoria,
                "cobrador" => $cobrador
            ];

            // Agregar el comprobante al array de socios
            $socios[] = $comprobante;
        }

        // Devolver todos los socios como respuesta
        echo json_encode([
            "success" => true,
            "socios" => $socios
        ]);
    } else {
        // Si no se encontraron socios
        echo json_encode(["success" => false, "message" => "No se encontraron socios"]);
    }
} else {
    // Si ocurre un error en la consulta
    echo json_encode(["success" => false, "message" => "Error en la consulta: " . $conn->error]);
}

$conn->close();
?>