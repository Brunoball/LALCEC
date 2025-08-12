// src/utils/comprobantes.js

// CSS compartido para comprobantes (misma estética que usabas en el componente)
const baseStyles = `
  @page {
      size: A4 portrait;
      margin: 0;
  }
  body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      position: relative;
      transform: rotate(90deg);
      transform-origin: top left;
      left: 70%;
      top: 0;
  }
  .gcuotas-contenedor {
      width: 210mm;
      margin: 10mm 0;
      page-break-after: always;
      box-sizing: border-box;
  }
  .gcuotas-comprobante {
      width: 100%;
      height: 100%;
      display: flex;
      box-sizing: border-box;
  }
  .gcuotas-talon-socio {
      width: 60%;
      padding-left: 20mm;
      padding-top: 13mm;
  }
  .gcuotas-talon-cobrador {
      width: 60mm;
      padding-left: 10mm;
      padding-top: 16mm;
  }
  p {
      margin-top: 5px;
      font-size: 13px;
  }
`;

/**
 * Construye el HTML de un solo comprobante.
 * @param {object} item - Socio o empresa.
 * @param {'socio'|'empresa'} viewType
 * @param {'pagado'|'deudores'} activeTab
 * @param {string[]} mesesSeleccionados
 * @returns {string} HTML
 */
export function buildComprobanteHTML(item, viewType, activeTab, mesesSeleccionados = []) {
  const mesesTexto = Array.isArray(mesesSeleccionados) ? mesesSeleccionados.join(', ') : String(mesesSeleccionados || '');
  const monto = item?.precio_categoria ?? "N/A";
  const categoria = item?.categoria ?? "";
  const domicilio = item?.domicilio || item?.domicilio_2 || "N/A";
  const medioPago = item?.medio_pago || "No especificado";
  const afiliadoEmp = viewType === "socio"
    ? `${item?.apellido ?? ""} ${item?.nombre ?? ""}`.trim()
    : (item?.razon_social ?? "");

  return `
    <div class="gcuotas-contenedor">
      <div class="gcuotas-comprobante">
        <div class="gcuotas-talon-socio">
          <p><strong>${viewType === "socio" ? "Afiliado:" : "Empresa:"}</strong> ${afiliadoEmp}</p>
          <p><strong>Domicilio:</strong> ${domicilio}</p>
          <p><strong>Categoría / Monto:</strong> ${categoria} / $${monto}</p>
          <p><strong>Período:</strong> ${mesesTexto}</p>
          <p><strong>Medio de Pago:</strong> ${medioPago}</p>
          ${activeTab === "pagado" ? `<p><strong>Estado:</strong> PAGADO</p>` : ""}
          <p>Por consultas comunicarse al 03564-15205778</p>
          <p>Las cuotas adeudadas se cobrarán al valor actualizado al momento del pago.</p>
        </div>

        <div class="gcuotas-talon-cobrador">
          <p><strong>${viewType === "socio" ? "Nombre y Apellido:" : "Empresa:"}</strong> ${afiliadoEmp}</p>
          <p><strong>Categoría / Monto:</strong> ${categoria} / $${monto}</p>
          <p><strong>Período:</strong> ${mesesTexto}</p>
          <p><strong>Medio de Pago:</strong> ${medioPago}</p>
          ${activeTab === "pagado" ? `<p><strong>Estado:</strong> PAGADO</p>` : ""}
        </div>
      </div>
    </div>
  `;
}

/**
 * Construye el HTML de múltiples comprobantes en lote.
 * @param {object[]} items
 * @param {'socio'|'empresa'} viewType
 * @param {'pagado'|'deudores'} activeTab
 * @param {string[]} mesesSeleccionados
 * @returns {string} HTML completo listo para imprimir
 */
export function buildComprobantesLoteHTML(items, viewType, activeTab, mesesSeleccionados = []) {
  const body = items.map(item => buildComprobanteHTML(item, viewType, activeTab, mesesSeleccionados)).join("\n");
  return `
    <html>
      <head>
        <title>Comprobantes de Pago</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        ${body}
      </body>
    </html>
  `;
}

/** Abre ventana e imprime HTML */
export function printHTML(html) {
  const w = window.open('', '', 'width=600,height=400');
  w.document.write(html);
  w.document.close();
  w.print();
}

/** Imprime un item */
export function printComprobanteItem(item, viewType, activeTab, mesesSeleccionados = []) {
  const fullHTML = `
    <html>
      <head>
        <title>Comprobante de Pago</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        ${buildComprobanteHTML(item, viewType, activeTab, mesesSeleccionados)}
      </body>
    </html>
  `;
  printHTML(fullHTML);
}

/** Imprime un lote de items */
export function printComprobantesLote(items, viewType, activeTab, mesesSeleccionados = []) {
  const html = buildComprobantesLoteHTML(items, viewType, activeTab, mesesSeleccionados);
  printHTML(html);
}
