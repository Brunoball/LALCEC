<?php
include 'db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$nombre_categoria = $data['nombre_categoria'] ?? null;

if ($nombre_categoria) {
    // Buscar ID de la categoría
    $query = "SELECT idCategorias FROM categorias WHERE Nombre_Categoria = ?";
    $stmt = $conn->prepare($query);
    
    if ($stmt) {
        $stmt->bind_param('s', $nombre_categoria);
        $stmt->execute();
        $result = $stmt->get_result();
        $categoria = $result->fetch_assoc();
        $stmt->close();

        if ($categoria) {
            $idCategoria = $categoria['idCategorias'];

            // 1. Desvincular socios de la categoría
            $updateQuery = "UPDATE socios SET idCategoria = NULL WHERE idCategoria = ?";
            $updateStmt = $conn->prepare($updateQuery);
            if ($updateStmt) {
                $updateStmt->bind_param('i', $idCategoria);
                $updateStmt->execute();
                $updateStmt->close();
            }

            // 2. Eliminar precios históricos asociados
            $deleteHistQuery = "DELETE FROM historico_precios_categorias WHERE idCategoria = ?";
            $histStmt = $conn->prepare($deleteHistQuery);
            if ($histStmt) {
                $histStmt->bind_param('i', $idCategoria);
                $histStmt->execute();
                $histStmt->close();
            }

            // 3. Eliminar la categoría
            $deleteQuery = "DELETE FROM categorias WHERE idCategorias = ?";
            $deleteStmt = $conn->prepare($deleteQuery);
            if ($deleteStmt) {
                $deleteStmt->bind_param('i', $idCategoria);
                $deleteStmt->execute();

                if ($deleteStmt->affected_rows > 0) {
                    echo json_encode(["success" => true, "message" => "Categoría y referencias eliminadas correctamente."]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "No se pudo eliminar la categoría."]);
                }

                $deleteStmt->close();
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Error al preparar consulta de eliminación."]);
            }
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Categoría no encontrada."]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al preparar consulta."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Falta el parámetro 'nombre_categoria'."]);
}

$conn->close();
?>
