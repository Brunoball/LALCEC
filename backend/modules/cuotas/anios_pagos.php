<?php
// backend/modules/cuotas/anios_pagos.php
// Devuelve la lista de años presentes en pagos y pagos_empresas (ordenados DESC)

include_once(__DIR__ . '/../../config/db.php');

try {
    $sql = "
        SELECT anio FROM (
            SELECT DISTINCT YEAR(fechaPago) AS anio
            FROM pagos
            WHERE fechaPago IS NOT NULL
            UNION
            SELECT DISTINCT YEAR(fechaPago) AS anio
            FROM pagos_empresas
            WHERE fechaPago IS NOT NULL
        ) t
        WHERE anio IS NOT NULL
        ORDER BY anio DESC
    ";

    $res = $conn->query($sql);
    $anios = [];

    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $anios[] = (int)$row['anio']; // normalizamos a entero
        }
    }

    echo json_encode($anios);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error"   => "No se pudieron obtener los años",
        "detalle" => $e->getMessage()
    ]);
}
