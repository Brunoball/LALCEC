<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once(__DIR__ . '/../../config/db.php');

// Obtener datos del request
$data = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Habilitar logging de errores
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validación más robusta
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['error' => 'Datos JSON inválidos']);
        exit();
    }

    $idCategoria = intval($input['idCategorias'] ?? 0);
    $nombre = trim($input['nombre_categoria'] ?? '');
    $precio = floatval($input['precio'] ?? 0);

    if ($idCategoria <= 0) {
        echo json_encode(['error' => 'ID de categoría inválido']);
        exit();
    }

    if (empty($nombre) || strlen($nombre) > 50) {
        echo json_encode(['error' => 'Nombre de categoría inválido (1-50 caracteres)']);
        exit();
    }

    if ($precio <= 0 || $precio > 999999.99) {
        echo json_encode(['error' => 'Precio inválido (0.01 - 999999.99)']);
        exit();
    }

    // Escapar valores
    $nombre = $conn->real_escape_string($nombre);
    $precio = number_format($precio, 2, '.', '');

    try {
        // Iniciar transacción
        $conn->begin_transaction();

        // 1. Obtener precio actual
        $stmt = $conn->prepare("SELECT Precio_Categoria FROM categorias WHERE idCategorias = ?");
        $stmt->bind_param("i", $idCategoria);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception("Categoría no encontrada");
        }

        $precio_actual = $result->fetch_assoc()['Precio_Categoria'];

        // 2. Guardar histórico si el precio cambió
        if (floatval($precio) !== floatval($precio_actual)) {
            $mes_actual = date('n');
            $stmt_hist = $conn->prepare("INSERT INTO historico_precios_categorias 
                                       (idCategoria, precio_anterior, precio_nuevo, idMes) 
                                       VALUES (?, ?, ?, ?)");
            $stmt_hist->bind_param("iddi", $idCategoria, $precio_actual, $precio, $mes_actual);
            if (!$stmt_hist->execute()) {
                throw new Exception("Error al guardar histórico: " . $conn->error);
            }
        }

        // 3. Actualizar categoría
        $stmt_update = $conn->prepare("UPDATE categorias SET 
                                     Nombre_Categoria = ?, 
                                     Precio_Categoria = ? 
                                     WHERE idCategorias = ?");
        $stmt_update->bind_param("sdi", $nombre, $precio, $idCategoria);
        
        if (!$stmt_update->execute()) {
            throw new Exception("Error al actualizar categoría: " . $conn->error);
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Categoría actualizada correctamente']);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if (!isset($_GET['nombre_categoria']) || empty($_GET['nombre_categoria'])) {
        echo json_encode(['error' => '⚠️ Falta el parámetro nombre_categoria']);
        exit();
    }

    $nombre_categoria = $conn->real_escape_string($_GET['nombre_categoria']);

    $query = "SELECT * FROM categorias WHERE Nombre_Categoria = '$nombre_categoria'";
    $result = $conn->query($query);

    if (!$result) {
        echo json_encode(['error' => '❌ Error en la consulta SQL: ' . $conn->error]);
        exit();
    }

    if ($result->num_rows > 0) {
        $categoria = $result->fetch_assoc();

        $query_hist = "SELECT h.fecha_cambio, h.precio_anterior, h.precio_nuevo, m.mes as nombre_mes
                       FROM historico_precios_categorias h
                       JOIN meses_pagos m ON h.idMes = m.idMes
                       WHERE h.idCategoria = {$categoria['idCategorias']}
                       ORDER BY h.fecha_cambio DESC";
        $result_hist = $conn->query($query_hist);
        $historico = [];

        if ($result_hist) {
            while ($row = $result_hist->fetch_assoc()) {
                $historico[] = $row;
            }
        }

        $categoria['historico_precios'] = $historico;

        echo json_encode(['data' => $categoria]);
    } else {
        echo json_encode(['error' => '⚠️ Categoría no encontrada']);
    }
}

$conn->close();
?>
