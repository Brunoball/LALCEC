<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

include(__DIR__ . '/db.php');

$data = json_decode(file_get_contents('php://input'), true);

// Capturar datos desde el request
$idSocios = $data['idSocios'] ?? null;
$nombre = strtoupper($data['nombre'] ?? '');  // Convertir a mayúsculas
$apellido = strtoupper($data['apellido'] ?? '');  // Convertir a mayúsculas
$dni = strtoupper($data['dni'] ?? '');  // Convertir a mayúsculas
$domicilio = strtoupper($data['domicilio'] ?? '');  // Convertir a mayúsculas
$domicilio_2 = strtoupper($data['domicilio_2'] ?? '');  // Convertir a mayúsculas
$numero = strtoupper($data['numero'] ?? '');  // Convertir a mayúsculas
$localidad = strtoupper($data['localidad'] ?? '');  // Convertir a mayúsculas
$telefono = strtoupper($data['telefono'] ?? '');  // Convertir a mayúsculas
$email = strtoupper($data['email'] ?? '');  // Convertir a mayúsculas
$observacion = strtoupper($data['observacion'] ?? '');  // Convertir a mayúsculas
$idCategoria = !empty($data['categoria']) ? $data['categoria'] : null;
$idMediosPago = $data['medioPago'] ?? null;

header('Content-Type: application/json');

// Validar que exista un ID de socio
if ($idSocios) {
    // Validaciones para campos de texto (nombre, apellido, localidad, domicilio, observacion)
    if ($nombre !== '' && (!preg_match("/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/", $nombre) || strlen($nombre) > 40)) {
        echo json_encode(["message" => "El nombre solo puede contener letras (incluyendo acentos y ñ) y un máximo de 40 caracteres."]);
        exit();
    }
    
    if ($apellido !== '' && (!preg_match("/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/", $apellido) || strlen($apellido) > 40)) {
        echo json_encode(["message" => "El apellido solo puede contener letras (incluyendo acentos y ñ) y un máximo de 40 caracteres."]);
        exit();
    }
    
    if ($localidad !== '' && (!preg_match("/^[a-zA-Z\s]+$/", $localidad) || strlen($localidad) > 40)) {
        echo json_encode(["message" => "La localidad solo puede contener letras y un máximo de 40 caracteres."]);
        exit();
    }


    if ($domicilio !== '' && (!preg_match("/^[a-zA-Z0-9\s]+$/", $domicilio) || strlen($domicilio) > 40)) {
        echo json_encode(["message" => "El domicilio solo puede contener letras, números y un máximo de 40 caracteres."]);
        exit();
    }
    

    if ($observacion !== '' && (!preg_match("/^[a-zA-Z0-9\s]+$/", $observacion) || strlen($observacion) > 40)) {
        echo json_encode(["message" => "La observación solo puede contener letras, números y un máximo de 40 caracteres."]);
        exit();
    }
    

    // Validaciones para campos numéricos (dni, telefono, numero) que permitan puntos
    if ($dni !== '' && (!preg_match("/^[0-9\.]+$/", $dni) || strlen($dni) > 20)) {
        echo json_encode(["message" => "El DNI solo puede contener números y puntos, con un máximo de 20 caracteres."]);
        exit();
    }


    // Permitir números, guiones y espacios en el teléfono
    if ($telefono !== '' && (!preg_match("/^[0-9\- ]+$/", $telefono) || strlen($telefono) > 20)) {
        echo json_encode(["message" => "El teléfono solo puede contener números, guiones y espacios, con un máximo de 20 caracteres."]);
        exit();
    }


    if ($numero !== '' && (!preg_match("/^[0-9]+$/", $numero) || strlen($numero) > 20)) {
        echo json_encode(["message" => "El número solo puede contener números y un máximo de 20 caracteres."]);
        exit();
    }

    // Validación para domicilio_2 (solo letras, números, y espacios, con un máximo de 40 caracteres)
    if ($domicilio_2 !== '' && (!preg_match("/^[a-zA-Z0-9\s]+$/", $domicilio_2) || strlen($domicilio_2) > 40)) {
        echo json_encode(["message" => "El domicilio 2 solo puede contener letras y números con un máximo de 40 caracteres."]);
        exit();
    }




    $email = trim(strtolower($email)); // Normaliza el email a minúsculas y elimina espacios

    if ($email !== '' && !preg_match("/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|com\.ar)$/i", $email)) {
        echo json_encode(["message" => "El email ingresado debe ser válido, sin espacios y terminar en '.com' o '.com.ar'."]);
        exit();
    }


    

    $query = "
        UPDATE socios 
        SET 
            nombre = ?, 
            apellido = ?, 
            DNI = ?, 
            domicilio = ?, 
            domicilio_2 = ?,  
            numero = ?, 
            localidad = ?, 
            telefono = ?, 
            email = ?, 
            observacion = ?,  
            idCategoria = ?, 
            idMedios_Pago = ? 
        WHERE idSocios = ?
    ";

    $stmt = $conn->prepare($query);
    if ($stmt) {
        // Enlazar los parámetros
        $stmt->bind_param(
            'ssssssssssiii',
            $nombre, 
            $apellido, 
            $dni, 
            $domicilio, 
            $domicilio_2,  // Enlace para domicilio_2
            $numero, 
            $localidad, 
            $telefono, 
            $email, 
            $observacion,  // Enlace para observación
            $idCategoria, 
            $idMediosPago, 
            $idSocios
        );
        $stmt->execute();

        // Verificar si se actualizó alguna fila
        if ($stmt->affected_rows > 0) {
            echo json_encode(["message" => "Socio actualizado correctamente"]);
        } else {
            echo json_encode(["message" => "No se encontraron cambios para actualizar"]);
        }

        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al preparar la consulta"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Falta el ID del socio para actualizar"]);
}

$conn->close();
?>
