<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once "../db.php"; // variable $conn

$response = ['success' => false, 'data' => [], 'message' => ''];

try {
    $action = $_GET['action'] ?? '';

    if ($action === 'get_months_with_categories') {
        // 1. Obtener todos los meses ordenados por fecha_agregado
        $sqlMonths = "SELECT mes, idMes FROM meses_pagos ORDER BY fecha_agregado ASC";
        $resultMonths = $conn->query($sqlMonths);
        if (!$resultMonths) throw new Exception("Error al obtener meses: " . $conn->error);

        $months = [];
        while ($row = $resultMonths->fetch_assoc()) {
            $months[] = [
                'nombre' => $row['mes'],  // ej. "Enero-2024"
                'idMes' => $row['idMes']
            ];
        }

        // 2. Obtener todas las categorías con su precio inicial y fecha de creación
        $sqlCategories = "SELECT 
                            c.idCategorias,
                            c.Nombre_Categoria,
                            c.Precio_Categoria as precio_inicial,
                            c.fecha_agregado as fecha_creacion
                          FROM categorias c
                          ORDER BY c.fecha_agregado ASC";
        $resultCategories = $conn->query($sqlCategories);
        if (!$resultCategories) throw new Exception("Error al obtener categorías: " . $conn->error);

        $allCategories = [];
        while ($row = $resultCategories->fetch_assoc()) {
            $fechaCreacion = $row['fecha_creacion'] ? strtotime($row['fecha_creacion']) : null;
            $mesCreacion = $fechaCreacion ? intval(date('m', $fechaCreacion)) : 1;
            $anioCreacion = $fechaCreacion ? intval(date('Y', $fechaCreacion)) : 1970;

            $allCategories[$row['idCategorias']] = [
                'nombre' => $row['Nombre_Categoria'],
                'precio_inicial' => $row['precio_inicial'],
                'fecha_creacion' => $row['fecha_creacion'],
                'mes_creacion' => $mesCreacion,
                'anio_creacion' => $anioCreacion
            ];
        }

        // Obtener los cambios históricos de precios para todas las categorías
        $historicos = [];
        $sqlHistoricos = "SELECT 
                            h.idCategoria,
                            h.precio_nuevo,
                            m.mes,
                            m.fecha_agregado,
                            m.idMes
                          FROM historico_precios_categorias h
                          INNER JOIN meses_pagos m ON h.idMes = m.idMes
                          ORDER BY m.fecha_agregado ASC";
        $resultHistoricos = $conn->query($sqlHistoricos);
        if (!$resultHistoricos) throw new Exception("Error al obtener histórico de precios: " . $conn->error);

        while ($row = $resultHistoricos->fetch_assoc()) {
            $mesCambioStr = $row['mes']; // ej. "Abril-2024"
            $partsCambio = explode('-', $mesCambioStr);
            $nombreMesCambio = trim($partsCambio[0]);
            $anioCambio = intval($partsCambio[1] ?? date('Y'));
            $mesCambioNum = date('m', strtotime("1 $nombreMesCambio $anioCambio"));

            $historicos[] = [
                'idCategoria' => $row['idCategoria'],
                'precio_nuevo' => $row['precio_nuevo'],
                'mesCambioNum' => intval($mesCambioNum),
                'anioCambioNum' => $anioCambio
            ];
        }

        $resultadoFinal = [];

        foreach ($months as $monthData) {
            $monthName = $monthData['nombre']; // ej. "Enero-2024"
            $idMesActual = $monthData['idMes'];

            $parts = explode('-', $monthName);
            $nombreMes = trim($parts[0]);
            $anioMes = intval($parts[1] ?? date('Y'));
            $mesNumero = intval(date('m', strtotime("1 $nombreMes $anioMes")));

            $categoriasDelMes = [];

            foreach ($allCategories as $idCategoria => $categoria) {
                // Verificar si la categoría fue creada en o antes del mes actual
                $creacionValida = false;
                if ($anioMes > $categoria['anio_creacion']) {
                    $creacionValida = true;
                } elseif ($anioMes == $categoria['anio_creacion'] && $mesNumero >= $categoria['mes_creacion']) {
                    $creacionValida = true;
                }

                if (!$creacionValida) continue;

                // Precio actual inicia con precio inicial
                $precioActual = $categoria['precio_inicial'];

                // Buscar el cambio más reciente antes o igual al mes actual
                $precioMasReciente = null;
                $anioMasReciente = null;
                $mesMasReciente = null;

                foreach ($historicos as $h) {
                    if ($h['idCategoria'] == $idCategoria) {
                        // Si el cambio fue en un año menor, siempre aplica
                        if ($h['anioCambioNum'] < $anioMes) {
                            if ($anioMasReciente === null || $anioMasReciente < $h['anioCambioNum'] ||
                                ($anioMasReciente == $h['anioCambioNum'] && $mesMasReciente < $h['mesCambioNum'])) {
                                $precioMasReciente = $h['precio_nuevo'];
                                $anioMasReciente = $h['anioCambioNum'];
                                $mesMasReciente = $h['mesCambioNum'];
                            }
                        } elseif ($h['anioCambioNum'] == $anioMes) {
                            // Mismo año, comparar mes
                            if ($h['mesCambioNum'] <= $mesNumero) {
                                if ($anioMasReciente === null || $anioMasReciente < $h['anioCambioNum'] ||
                                    ($anioMasReciente == $h['anioCambioNum'] && $mesMasReciente < $h['mesCambioNum'])) {
                                    $precioMasReciente = $h['precio_nuevo'];
                                    $anioMasReciente = $h['anioCambioNum'];
                                    $mesMasReciente = $h['mesCambioNum'];
                                }
                            }
                        }
                    }
                }

                if ($precioMasReciente !== null) {
                    $precioActual = $precioMasReciente;
                }

                $categoriasDelMes[] = [
                    'nombre' => $categoria['nombre'],
                    'precio' => $precioActual
                ];
            }

            // Eliminar duplicados por nombre y ordenar alfabéticamente
            $categoriasUnicas = [];
            foreach ($categoriasDelMes as $cat) {
                $categoriasUnicas[$cat['nombre']] = $cat['precio'];
            }
            ksort($categoriasUnicas);

            $categoriasFinal = [];
            foreach ($categoriasUnicas as $nombre => $precio) {
                $categoriasFinal[] = [
                    'nombre' => $nombre,
                    'precio' => $precio
                ];
            }

            $resultadoFinal[] = [
                'mes' => $monthName,
                'categorias' => $categoriasFinal
            ];
        }

        $response['success'] = true;
        $response['data'] = $resultadoFinal;

    } elseif ($action === 'get_months') {
        $sql = "SELECT mes FROM meses_pagos ORDER BY fecha_agregado ASC";
        $result = $conn->query($sql);
        if (!$result) throw new Exception("Error al obtener meses: " . $conn->error);

        $months = [];
        while ($row = $result->fetch_assoc()) {
            $months[] = $row['mes'];
        }

        $response['success'] = true;
        $response['data'] = $months;

    } elseif ($action === 'get_categories' && !empty($_GET['month'])) {
        $month = $conn->real_escape_string($_GET['month']);

        // Obtener idMes para el mes seleccionado
        $sqlIdMes = "SELECT idMes FROM meses_pagos WHERE mes = ?";
        $stmtIdMes = $conn->prepare($sqlIdMes);
        if (!$stmtIdMes) throw new Exception("Error en la consulta preparada: " . $conn->error);
        $stmtIdMes->bind_param("s", $month);
        $stmtIdMes->execute();
        $resultIdMes = $stmtIdMes->get_result();
        $idMesActual = $resultIdMes->fetch_assoc()['idMes'] ?? null;
        if (!$idMesActual) throw new Exception("Mes no encontrado");

        // Obtener mes y año del mes seleccionado
        $partsMonth = explode('-', $month);
        $nombreMes = trim($partsMonth[0]);
        $anioSeleccionado = intval($partsMonth[1] ?? date('Y'));
        $mesNumero = intval(date('m', strtotime("1 $nombreMes $anioSeleccionado")));

        // Obtener categorías creadas antes o durante el mes seleccionado
        $sqlCategorias = "SELECT 
                            c.idCategorias,
                            c.Nombre_Categoria,
                            c.Precio_Categoria as precio_inicial,
                            c.fecha_agregado
                          FROM categorias c
                          ORDER BY c.Nombre_Categoria";
        $resultCategorias = $conn->query($sqlCategorias);
        if (!$resultCategorias) throw new Exception("Error al obtener categorías: " . $conn->error);

        $categories = [];
        while ($row = $resultCategorias->fetch_assoc()) {
            $fechaCreacion = $row['fecha_agregado'] ? strtotime($row['fecha_agregado']) : null;
            $mesCreacion = $fechaCreacion ? intval(date('m', $fechaCreacion)) : 1;
            $anioCreacion = $fechaCreacion ? intval(date('Y', $fechaCreacion)) : 1970;

            $creacionValida = false;
            if ($anioSeleccionado > $anioCreacion) {
                $creacionValida = true;
            } elseif ($anioSeleccionado == $anioCreacion && $mesNumero >= $mesCreacion) {
                $creacionValida = true;
            }

            if (!$creacionValida) continue;

            $categories[$row['idCategorias']] = [
                'nombre' => $row['Nombre_Categoria'],
                'precio_inicial' => $row['precio_inicial'],
                'fecha_creacion' => $row['fecha_agregado'],
                'mes_creacion' => $mesCreacion,
                'anio_creacion' => $anioCreacion
            ];
        }

        // Obtener cambios de precios para el mes seleccionado
        $sqlHistorico = "SELECT 
                            h.idCategoria,
                            h.precio_nuevo,
                            m.mes,
                            m.fecha_agregado
                          FROM historico_precios_categorias h
                          INNER JOIN meses_pagos m ON h.idMes = m.idMes
                          WHERE m.fecha_agregado <= (SELECT fecha_agregado FROM meses_pagos WHERE mes = ?)
                          ORDER BY m.fecha_agregado ASC";
        $stmtHist = $conn->prepare($sqlHistorico);
        if (!$stmtHist) throw new Exception("Error en consulta histórica: " . $conn->error);
        $stmtHist->bind_param("s", $month);
        $stmtHist->execute();
        $resultHist = $stmtHist->get_result();

        $historicos = [];
        while ($row = $resultHist->fetch_assoc()) {
            $mesCambioStr = $row['mes'];
            $partsCambio = explode('-', $mesCambioStr);
            $nombreMesCambio = trim($partsCambio[0]);
            $anioCambio = intval($partsCambio[1] ?? date('Y'));
            $mesCambioNum = date('m', strtotime("1 $nombreMesCambio $anioCambio"));

            $historicos[] = [
                'idCategoria' => $row['idCategoria'],
                'precio_nuevo' => $row['precio_nuevo'],
                'mesCambioNum' => intval($mesCambioNum),
                'anioCambioNum' => $anioCambio
            ];
        }

        $categoriasDelMes = [];

        foreach ($categories as $idCategoria => $categoria) {
            $precioActual = $categoria['precio_inicial'];

            $precioMasReciente = null;
            $anioMasReciente = null;
            $mesMasReciente = null;

            foreach ($historicos as $h) {
                if ($h['idCategoria'] == $idCategoria) {
                    if ($h['anioCambioNum'] < $anioSeleccionado) {
                        if ($anioMasReciente === null || $anioMasReciente < $h['anioCambioNum'] ||
                            ($anioMasReciente == $h['anioCambioNum'] && $mesMasReciente < $h['mesCambioNum'])) {
                            $precioMasReciente = $h['precio_nuevo'];
                            $anioMasReciente = $h['anioCambioNum'];
                            $mesMasReciente = $h['mesCambioNum'];
                        }
                    } elseif ($h['anioCambioNum'] == $anioSeleccionado) {
                        if ($h['mesCambioNum'] <= $mesNumero) {
                            if ($anioMasReciente === null || $anioMasReciente < $h['anioCambioNum'] ||
                                ($anioMasReciente == $h['anioCambioNum'] && $mesMasReciente < $h['mesCambioNum'])) {
                                $precioMasReciente = $h['precio_nuevo'];
                                $anioMasReciente = $h['anioCambioNum'];
                                $mesMasReciente = $h['mesCambioNum'];
                            }
                        }
                    }
                }
            }

            if ($precioMasReciente !== null) {
                $precioActual = $precioMasReciente;
            }

            $categoriasDelMes[] = [
                'nombre' => $categoria['nombre'],
                'precio' => $precioActual
            ];
        }

        // Ordenar alfabéticamente
        usort($categoriasDelMes, fn($a, $b) => strcmp($a['nombre'], $b['nombre']));

        $response['success'] = true;
        $response['data'] = $categoriasDelMes;

    } else {
        $response['message'] = "Acción inválida o parámetros faltantes.";
    }

} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
