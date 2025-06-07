<?php
// Permitir solicitudes desde cualquier origen
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");

// Si la solicitud es de tipo OPTIONS (preflight), simplemente devuelve una respuesta vacía
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once(__DIR__ . '/../../config/db.php');

// Recibir datos del frontend
$data = json_decode(file_get_contents("php://input"), true);

// Verificar que los datos hayan sido recibidos correctamente
if (!isset($data['nombre']) || !isset($data['apellido']) || !isset($data['meses'])) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

$nombre = $data['nombre'];
$apellido = $data['apellido'];
$mesesSeleccionados = $data['meses']; // Array de IDs de meses seleccionados
$fechaPago = date('Y-m-d'); // Fecha actual
$mesContable = date('n'); // Número del mes actual (1-12)

// Verificar que los datos no estén vacíos
if (!empty($nombre) && !empty($apellido) && !empty($mesesSeleccionados)) {
    // Consultar el idSocio basado en el nombre y apellido
    $stmt = $conn->prepare("SELECT idSocios FROM socios WHERE nombre = ? AND apellido = ?");
    $stmt->bind_param("ss", $nombre, $apellido);
    $stmt->execute();
    $stmt->bind_result($idSocio);
    $stmt->fetch();
    $stmt->close();

    // Verificar si se encontró el socio
    if (!$idSocio) {
        echo json_encode(["success" => false, "message" => "Socio no encontrado"]);
        exit;
    }

    // Iniciar una transacción para asegurar la integridad de los datos
    $conn->begin_transaction();

    try {
        // Preparar la consulta para insertar los pagos incluyendo mes_contable
        $stmt = $conn->prepare("INSERT INTO pagos (idSocios, idMes, fechaPago, mes_contable) VALUES (?, ?, ?, ?)");

        // Insertar cada mes seleccionado en la base de datos
        foreach ($mesesSeleccionados as $idMes) {
            $stmt->bind_param("iisi", $idSocio, $idMes, $fechaPago, $mesContable);
            $stmt->execute();
        }

        // Confirmar la transacción
        $conn->commit();
        echo json_encode(["success" => true, "message" => "Pagos registrados con éxito."]);
    } catch (Exception $e) {
        // Si ocurre un error, deshacer los cambios
        $conn->rollback();
        echo json_encode(["success" => false, "message" => "Error al registrar los pagos: " . $e->getMessage()]);
    } finally {
        // Cerrar la declaración preparada
        $stmt->close();
    }
} else {
    // Si faltan datos, enviar un mensaje de error
    echo json_encode(["success" => false, "message" => "Faltan datos para procesar los pagos."]);
}

// Cerrar la conexión con la base de datos
$conn->close();
?>
