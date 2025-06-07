<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once(__DIR__ . '/../../config/db.php');

$razon_social = $_GET['razon_social'] ?? null;

header('Content-Type: application/json');

if ($razon_social) {
    $query = "
        SELECT 
            e.idEmp,
            e.razon_social,
            e.domicilio,
            e.domicilio_2,  -- Agregamos domicilio_2 aquí
            e.telefono,
            e.email,
            e.observacion,
            e.idCategorias,
            e.idMedios_Pago,
            e.cuit, -- Campo CUIT
            e.id_iva, -- Campo id_iva
            c.Nombre_categoria AS categoria,
            c.Precio_Categoria AS precio_categoria,
            iva.descripcion AS descripcion_iva -- Obtener la descripción del IVA desde la tabla 'condicional_iva'
        FROM 
            empresas e
        LEFT JOIN 
            categorias c ON e.idCategorias = c.idCategorias
        LEFT JOIN
            condicional_iva iva ON e.id_iva = iva.id_iva -- Hacer JOIN con la tabla condicional_iva para obtener la descripción del IVA
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

            // Obtener categorías
            $categoriasQuery = "SELECT idCategorias, Nombre_categoria, Precio_Categoria FROM categorias";
            $categoriasResult = $conn->query($categoriasQuery);
            $categorias = [];
            while ($row = $categoriasResult->fetch_assoc()) {
                $categorias[] = $row;
            }

            // Obtener medios de pago
            $mediosPagoQuery = "SELECT IdMedios_pago, Medio_Pago FROM mediospago";
            $mediosPagoResult = $conn->query($mediosPagoQuery);
            $mediosPago = [];
            while ($row = $mediosPagoResult->fetch_assoc()) {
                $mediosPago[] = $row;
            }

            // Obtener condiciones de IVA
            $condicionesIvaQuery = "SELECT id_iva, descripcion FROM condicional_iva";
            $condicionesIvaResult = $conn->query($condicionesIvaQuery);
            $condicionesIva = [];
            while ($row = $condicionesIvaResult->fetch_assoc()) {
                $condicionesIva[] = $row;
            }

            $empresa['categorias'] = $categorias;
            $empresa['mediosPago'] = $mediosPago;
            $empresa['condicionesIva'] = $condicionesIva; // Agregar condiciones de IVA

            // Agregar domicilio_2 al resultado
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
