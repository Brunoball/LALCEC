<?php
// Incluir conexión a la base de datos si es necesario
include '../db.php';

// Recibir los datos del primer script
if (!isset($_GET['data'])) {
    die("Error: No se recibieron datos de socios");
}

$socios = json_decode(urldecode($_GET['data']), true);

if (empty($socios)) {
    die("No hay socios para contactar con transferencia pendiente");
}

// Configuración para WhatsApp
$mensaje_base = "Estimado socio, le recordamos que tiene una cuota pendiente. ¿Podría regularizar su situación?";

// Procesar cada socio
foreach ($socios as $socio) {
    $apellido = htmlspecialchars($socio['apellido']);
    $telefono = htmlspecialchars($socio['telefono']);
    
    // Crear enlace de WhatsApp
    $enlace_whatsapp = "https://wa.me/{$telefono}?text=" . urlencode($mensaje_base);
    
    // Mostrar información (puedes modificar esto según tus necesidades)
    echo "<div style='margin-bottom: 15px; padding: 10px; border: 1px solid #ddd;'>";
    echo "<h3>Socio: {$apellido}</h3>";
    echo "<p>Teléfono: {$telefono}</p>";
    echo "<a href='{$enlace_whatsapp}' target='_blank' style='background-color: #25D366; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px;'>Enviar mensaje por WhatsApp</a>";
    echo "</div>";
    
    // Aquí podrías agregar lógica para enviar automáticamente si tienes API de WhatsApp Business
    // Ejemplo:
    // enviarWhatsApp($telefono, $mensaje_base);
}

// Función de ejemplo para envío automático (requiere configuración adicional)
/*
function enviarWhatsApp($numero, $mensaje) {
    // Implementación con la API de WhatsApp Business
    // Necesitarías tokens de acceso y configuración adecuada
}
*/
?>