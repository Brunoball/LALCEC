<?php
include(__DIR__ . '/db.php');
$tipo = $_GET['tipo'];
$data = [];

if ($tipo === 'socios' || $tipo === 'empresa') {
  // Lógica para obtener los socios o empresas
  $data = obtenerEntidades($tipo);
} else {
  http_response_code(400);
  echo json_encode(["error" => "Tipo de entidad no válido"]);
  exit;
}

echo json_encode($data);

function obtenerEntidades($tipoEntidad) {
  global $conn; // Asegúrate de que $conn es la conexión a la base de datos
  
  // Prepara la consulta SQL con un parámetro para tipo de entidad
  $stmt = $conn->prepare("SELECT * FROM socios WHERE Tipo_Entidad = ?");
  if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "Error en la preparación de la consulta: " . $conn->error]);
    exit;
  }

  // Vincula el parámetro tipoEntidad
  $stmt->bind_param("s", $tipoEntidad);
  $stmt->execute();
  $result = $stmt->get_result();
  if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => "Error en la ejecución de la consulta: " . $stmt->error]);
    exit;
  }

  // Inicializamos el arreglo para almacenar las entidades
  $entidades = $result->fetch_all(MYSQLI_ASSOC);
  
  // Separamos los resultados en socios y empresas si fuera necesario
  $socios = [];
  $empresas = [];
  
  // Recorremos las entidades para hacer la distinción
  foreach ($entidades as $entidad) {
    if ($entidad['Tipo_Entidad'] === 'socios') {
      $socios[] = $entidad;
    } elseif ($entidad['Tipo_Entidad'] === 'empresa') {
      $empresas[] = $entidad;
    }
  }
  
  // Retornamos los datos según el tipo solicitado
  if ($tipoEntidad === 'socios') {
    return $socios;
  } elseif ($tipoEntidad === 'empresa') {
    return $empresas;
  }
  
  $stmt->close();
}
?>
