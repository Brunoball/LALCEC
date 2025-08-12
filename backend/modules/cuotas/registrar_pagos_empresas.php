<?php
// Permitir solicitudes desde cualquier origen
header("Access-Control-Allow-Origin: http://localhost:3000"); // Cambia a tu frontend si es diferente
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Si la solicitud es de tipo OPTIONS (preflight), simplemente devuelve una respuesta vacía
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once(__DIR__ . '/../../config/db.php');

// Recibir datos del frontend
$data = json_decode(file_get_contents("php://input"), true);

// Verificar que los datos hayan sido recibidos correctamente
if (!isset($data['razonSocial']) || !isset($data['meses'])) {
    echo json_encode(["success" => false, "message" => "Datos incompletos"]);
    exit;
}

$razonSocial = $data['razonSocial'];
$mesesSeleccionados = $data['meses']; // Array de IDs de meses seleccionados
$fechaPago = date('Y-m-d'); // Fecha actual

// Verificar que los datos no estén vacíos
if (!empty($razonSocial) && !empty($mesesSeleccionados)) {
    // Consultar el idEmp basado en la razón social
    $stmt = $conn->prepare("SELECT idEmp FROM empresas WHERE razon_social = ?");
    $stmt->bind_param("s", $razonSocial);
    $stmt->execute();
    $stmt->bind_result($idEmp);
    $stmt->fetch();
    $stmt->close();

    // Verificar si se encontró la empresa
    if (!$idEmp) {
        echo json_encode(["success" => false, "message" => "Empresa no encontrada"]);
        exit;
    }

    // Iniciar una transacción para asegurar la integridad de los datos
    $conn->begin_transaction();
    
    try {
        // Preparar la consulta para insertar los pagos
        $stmt = $conn->prepare("INSERT INTO pagos_empresas (idEmp, idMes, fechaPago) VALUES (?, ?, ?)");

        // Insertar cada mes seleccionado en la base de datos
        foreach ($mesesSeleccionados as $idMes) {
            $stmt->bind_param("iis", $idEmp, $idMes, $fechaPago);
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