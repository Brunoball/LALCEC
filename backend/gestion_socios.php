<?php
// Asegúrate de que la conexión a la base de datos esté incluida aquí o en el archivo principal
include(__DIR__ . '/db.php');

// Obtener la acción a realizar
$action = $_GET['action'] ?? '';

if ($action == 'agregar_socio') {
    $nombre = $_POST['nombre'] ?? '';
    $apellido = $_POST['apellido'] ?? '';
    $categoria = $_POST['categoria'] ?? '';
    $medio_pago = $_POST['medio_pago'] ?? '';

    if ($nombre && $apellido && $categoria && $medio_pago) {
        // Preparar la consulta para insertar el nuevo socio
        $query = "
            INSERT INTO socios (nombre, apellido, idCategoria, idMedios_Pago)
            VALUES (?, ?, ?, ?)
        ";

        $stmt = $conn->prepare($query);
        if ($stmt) {
            // Vincular parámetros y ejecutar
            $stmt->bind_param('ssii', $nombre, $apellido, $categoria, $medio_pago);
            $stmt->execute();

            // Verificar si la inserción fue exitosa
            if ($stmt->affected_rows > 0) {
                echo json_encode(["status" => "success", "message" => "Socio agregado correctamente"]);
            } else {
                echo json_encode(["status" => "error", "message" => "No se pudo agregar el socio"]);
            }

            $stmt->close();
        } else {
            echo json_encode(["status" => "error", "message" => "Error al preparar la consulta"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Datos incompletos"]);
    }
}

if ($action == 'obtener_socios') {
    // Obtener la letra para filtrar
    $letra = $_GET['letra'] ?? '';

    if (!empty($letra)) {
        // Preparar la consulta con prepared statements para evitar inyección SQL
        $query = "
            SELECT 
                s.nombre, 
                s.apellido, 
                c.Nombre_categoria AS categoria, 
                m.Medio_Pago AS medio_pago 
            FROM 
                socios s
            LEFT JOIN 
                categorias c ON s.idCategoria = c.idCategorias
            LEFT JOIN 
                mediospago m ON s.idMedios_Pago = m.IdMedios_pago
            WHERE 
                s.apellido LIKE CONCAT(?, '%')
            ORDER BY s.apellido ASC, s.nombre ASC
        ";

        // Preparar la consulta
        $stmt = $conn->prepare($query);

        if ($stmt) {
            // Vincular parámetros y ejecutar
            $stmt->bind_param('s', $letra);
            $stmt->execute();
            $result = $stmt->get_result();

            // Verificar si se encontraron socios
            if ($result->num_rows > 0) {
                $socios = [];
                while ($row = $result->fetch_assoc()) {
                    $socios[] = $row;
                }
                echo json_encode($socios);  // Devolver los socios encontrados con sus categorías y medios de pago
            } else {
                echo json_encode([]);  // Si no se encuentran socios, devolver un array vacío
            }

            // Liberar el resultado y cerrar el statement
            $stmt->close();
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Error al preparar la consulta"]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Falta la letra para filtrar los socios"]);
    }
}

// Cerrar la conexión a la base de datos
$conn->close();
?>
