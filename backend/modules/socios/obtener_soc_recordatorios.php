<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/../../config/db.php"; // $conn (mysqli)
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        out(["error" => "Método no permitido"], 405);
    }

    /**
     * 🔎 FILTRO CLAVE:
     * 👉 SOLO socios con enviar_recordatorio = 1
     * 👉 SOLO activos
     */
    $sql = "
        SELECT
            s.idSocios            AS id,
            s.Apellido            AS apellido,
            s.Nombre              AS nombre,
            s.DNI                 AS dni,
            s.Domicilio           AS domicilio,
            s.Numero              AS numero,
            s.Observacion         AS observacion,
            s.motivo              AS motivo,
            s.Localidad           AS localidad,
            s.Telefono            AS telefono,
            s.Email               AS email,
            s.Fechaunion          AS fecha_union,
            s.Domicilio_2         AS domicilio_2,
            s.enviar_recordatorio AS enviar_recordatorio,

            c.Nombre_Categoria    AS categoria,
            c.Precio_Categoria    AS precio_categoria

        FROM socios s
        LEFT JOIN categorias c ON c.idCategorias = s.idCategoria
        WHERE s.enviar_recordatorio = 1
          AND (s.activo IS NULL OR s.activo = 1)
        ORDER BY s.Apellido ASC, s.Nombre ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $res = $stmt->get_result();

    $socios = [];
    while ($row = $res->fetch_assoc()) {
        $socios[] = $row;
    }

    out([
        "ok" => true,
        "total" => count($socios),
        "socios" => $socios
    ]);

} catch (Throwable $e) {
    out([
        "error" => "Error al obtener socios para recordatorio",
        "detalle" => $e->getMessage()
    ], 500);
}
