<?php
// Incluir conexión a la base de datos
include '../db.php';

// Obtener el idMes actual (número de mes)
$mes_actual = date('n'); // enero = 1, febrero = 2, etc.

// Consulta para obtener socios con transferencia (idMedios_Pago = 2) 
// y que NO hayan pagado en el mes actual
$sql = "
    SELECT s.Apellido, s.Telefono
    FROM socios s
    WHERE s.idMedios_Pago = 2
    AND s.idSocios NOT IN (
        SELECT p.idSocios
        FROM pagos p
        WHERE p.idMes = ?
    )
";

// Preparar y ejecutar la consulta
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $mes_actual);
$stmt->execute();
$resultado = $stmt->get_result();

$socios = array();

if ($resultado->num_rows > 0) {
    while ($fila = $resultado->fetch_assoc()) {
        $telefono = $fila['Telefono'];
        
        if ($telefono !== null) {
            // 1. Eliminar todos los caracteres que no sean números
            $telefono = preg_replace('/\D/', '', $telefono);
            
            // 2. Eliminar el 0 inicial si existe
            if (strlen($telefono) > 0 && $telefono[0] === '0') {
                $telefono = substr($telefono, 1);
            }
            
            // 3. Eliminar el '15' si está justo después del código de área 3564
            if (strlen($telefono) > 6 && substr($telefono, 0, 4) === '3564' && substr($telefono, 4, 2) === '15') {
                $telefono = '3564' . substr($telefono, 6);
            }
            
            // 4. Agregar código de país si falta (Argentina = 54)
            if (strlen($telefono) >= 4 && substr($telefono, 0, 4) === '3564' && !str_starts_with($telefono, '54')) {
                $telefono = '54' . $telefono;
            }
            
            // Validar longitud mínima del teléfono
            if (strlen($telefono) >= 10) {
                $socios[] = array(
                    'apellido' => $fila['Apellido'],
                    'telefono' => $telefono
                );
            }
        }
    }
}

// Cerrar conexión
$stmt->close();
$conn->close();

// Redirigir a datos_wp.php con los datos codificados
header('Location: datos_wp.php?data=' . urlencode(json_encode($socios)));
exit;
?>