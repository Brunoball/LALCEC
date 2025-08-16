<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? null;

switch ($action) {
    // Login
    case 'inicio':
        require_once(__DIR__ . '/../modules/login/login.php');
        break;
    case 'register':
        require_once(__DIR__ . '/../modules/login/register.php');
        break;

    // Categorías
    case 'obtener_categoria':
        require_once(__DIR__ . '/../modules/categorias/gestionar_categoria.php');
        break;
    case 'eliminar_categoria':
        require_once(__DIR__ . '/../modules/categorias/eliminar_categoria.php');
        break;
    case 'agregar_categoria':
        require_once(__DIR__ . '/../modules/categorias/agregar_categoria.php');
        break;
    case 'editar_categoria':
        require_once(__DIR__ . '/../modules/categorias/editar_categoria.php');
        break;

    // Contable
    case 'contable':
        require_once(__DIR__ . '/../modules/contable/contable.php');
        break;
    case 'contable_emp':
        require_once(__DIR__ . '/../modules/contable/contable_emp.php');
        break;
    case 'precios_cat_mes':
        require_once(__DIR__ . '/../modules/contable/precios_cat_mes.php');
        break;

    case 'obtener_medios_pago':
        require_once(__DIR__ . '/../modules/contable/obtener_medios_pago.php');
        break;

    // Cuotas
    case 'cuotas':
        require_once(__DIR__ . '/../modules/cuotas/cuotas.php');
        break;
    case 'meses_pagos':
        require_once(__DIR__ . '/../modules/cuotas/meses_pagos.php');
        break;
    case 'obtener_datos':
        require_once(__DIR__ . '/../modules/cuotas/obtener_datos.php');
        break;
    case 'monto_pago':
        require_once(__DIR__ . '/../modules/cuotas/Monto_pago.php');
        break;
    case 'monto_pago_empresas':
        require_once(__DIR__ . '/../modules/cuotas/Monto_pago_empresas.php');
        break;
    case 'registrar_pago':
        require_once(__DIR__ . '/../modules/cuotas/registrar_pagos.php');
        break;
    case 'registrar_pago_empresas':
        require_once(__DIR__ . '/../modules/cuotas/registrar_pagos_empresas.php');
        break;

    case 'eliminar_pago':
        require_once(__DIR__ . '/../modules/cuotas/eliminar_pago.php');
        break;


    // SOCIOS
    case 'agregar_socio':
        require_once(__DIR__ . '/../modules/socios/agregar_socios.php');
        break;
    case 'editar_socio':
        require_once(__DIR__ . '/../modules/socios/editar_socio.php');
        break;
    case 'obtener_socio':
        require_once(__DIR__ . '/../modules/socios/obtener_socio.php');
        break;
    case 'buscar_socio':
        require_once(__DIR__ . '/../modules/socios/buscarSocio.php');
        break;
    case 'eliminar_socio':
        require_once(__DIR__ . '/../modules/socios/eliminar_socio.php');
        break;
    case 'obtener_datos_socios':
        require_once(__DIR__ . '/../modules/socios/obtener_datos.php');
        break;
    case 'obtener_letra':
        require_once(__DIR__ . '/../modules/socios/obtener_letra.php');
        break;
    case 'todos_socios':
        require_once(__DIR__ . '/../modules/socios/todos_socios.php');
        break;
    case 'filtro_mp':
        require_once(__DIR__ . '/../modules/socios/filtro_mp.php');
        break;

    // >>> BAJA/ALTA SOCIO
    case 'dar_baja':
        require_once(__DIR__ . '/../modules/socios/dar_baja.php');
        break;
    case 'estado_socio':
        require_once(__DIR__ . '/../modules/socios/estado_socio.php');
        break;

    // EMPRESAS
    case 'agregar_empresa':
        require_once(__DIR__ . '/../modules/empresas/agregar_empresa.php');
        break;
    case 'buscar_empresa':
        require_once(__DIR__ . '/../modules/empresas/buscarEmpresa.php');
        break;
    case 'editar_empresa':
        require_once(__DIR__ . '/../modules/empresas/editar_empresa.php');
        break;
    case 'eliminar_empresa':
        require_once(__DIR__ . '/../modules/empresas/eliminar_empresa.php');
        break;
    case 'filtro_empresas_mp':
        require_once(__DIR__ . '/../modules/empresas/filtro_empresas_mp.php');
        break;
    case 'obtener_datos_empresas':
        require_once(__DIR__ . '/../modules/empresas/obtener_datos.php');
        break;
    case 'obtener_empresa':
        require_once(__DIR__ . '/../modules/empresas/obtener_empresa.php');
        break;
    case 'obtener_letras_empresa':
        require_once(__DIR__ . '/../modules/empresas/obtener_letras_empresa.php');
        break;
    case 'todos_empresas':
        require_once(__DIR__ . '/../modules/empresas/todos_empresas.php');
        break;

    // >>> NUEVO: BAJA/ALTA/LISTADO EMPRESAS
    case 'estado_empresa':
        require_once(__DIR__ . '/../modules/empresas/estado_empresa.php');
        break;

    default:
        http_response_code(404);
        echo json_encode(["error" => "Acción no válida"]);
        break;
}
