import React, { useState, useEffect } from 'react';
import BASE_URL from "../../config/config";

const ModalPagosEmpresas = ({ razonSocial, cerrarModal, onPagoRealizado }) => {
  const [mesesSeleccionados, setMesesSeleccionados] = useState([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [precioMensual, setPrecioMensual] = useState(0);
  const [modalVisible, setModalVisible] = useState(true);
  const [error, setError] = useState('');
  const [mesesPagados, setMesesPagados] = useState([]);
  const [fechaUnion, setFechaUnion] = useState(null);
  const [empresaData, setEmpresaData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para formatear correctamente la fecha
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-AR');
  };

  useEffect(() => {
    const obtenerDatosEmpresa = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api.php?action=monto_pago_empresas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            razonSocial, 
            tipoEntidad: "empresa" 
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setPrecioMensual(result.precioMes || 0);
          setMesesPagados(result.mesesPagados || []);
          setFechaUnion(result.fechaUnion || new Date().toISOString().split('T')[0]);
          setEmpresaData({
            domicilio: result.domicilio_2 || '',
            categoria: result.categoria || '',
            cobrador: result.cobrador || ''
          });
        } else {
          setError(result.message || "Error al obtener datos de la empresa");
        }
      } catch (error) {
        setError("Ocurrió un error al obtener los datos de la empresa.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (razonSocial) {
      obtenerDatosEmpresa();
    }
  }, [razonSocial]);



  const totalPagar = mesesSeleccionados.length * precioMensual;

  // Función para obtener los meses disponibles basados en la fecha de unión
  const getMesesDisponibles = () => {
    if (!fechaUnion) return [];
    
    try {
      const fechaUnionObj = new Date(fechaUnion + 'T00:00:00');
      const mesUnion = fechaUnionObj.getMonth() + 1; // Los meses en JS van de 0-11
      const añoActual = new Date().getFullYear();
      const añoUnion = fechaUnionObj.getFullYear();
      
      // Si la empresa se unió en el año actual, solo mostramos desde el mes de unión
      if (añoUnion === añoActual) {
        return [...Array(12 - mesUnion + 1)].map((_, i) => ({ 
          id: mesUnion + i, 
          nombre: new Date(0, mesUnion + i - 1).toLocaleString('es', { month: 'long' }).toUpperCase() 
        }));
      }
      // Si se unió en un año anterior, mostramos todos los meses
      return [...Array(12)].map((_, i) => ({ 
        id: i + 1, 
        nombre: new Date(0, i).toLocaleString('es', { month: 'long' }).toUpperCase() 
      }));
    } catch (e) {
      console.error("Error al procesar fecha de unión:", e);
      return [];
    }
  };

  const meses = getMesesDisponibles();

  const handleSeleccionarMes = (mes) => {
    if (mesesPagados.includes(mes)) return;
    setMesesSeleccionados(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const handleSeleccionarTodos = () => {
    const mesesDisponibles = meses.filter(m => !mesesPagados.includes(m.id)).map(m => m.id);
    setMesesSeleccionados(todosSeleccionados ? [] : mesesDisponibles);
    setTodosSeleccionados(!todosSeleccionados);
  };

  const handleRealizarPago = async () => {
    if (mesesSeleccionados.length === 0) return;

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=registrar_pago_empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razonSocial,
          meses: mesesSeleccionados,
          tipoEntidad: "empresa"
        })
      });

      const result = await response.json();

      if (result.success) {
        setPagoExitoso(true);
        setModalVisible(false);
        if (onPagoRealizado) onPagoRealizado();
      } else {
        setError(result.message || "Error al registrar el pago");
      }
    } catch (error) {
      setError("Ocurrió un error al realizar el pago.");
      console.error(error);
    }
  };



  const handleImprimirComprobante = () => {
    if (!empresaData || mesesSeleccionados.length === 0) return;
    
    const mesesPagadosStr = meses
      .filter(m => mesesSeleccionados.includes(m.id))
      .map(m => m.nombre)
      .join(", ");

    const comprobanteHTML = `
      <html>
      <head>
          <title>Comprobante de Pago</title>
          <style>
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
                  justify-content: center;
                  align-items: center;
              }
              .contenedor {
                width: 210mm;
                height: 70mm;
                position: absolute;
                top: 33%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(90deg);
                transform-origin: center center;
                box-sizing: border-box;
              }
              .comprobante {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  box-sizing: border-box;
              }
              .talon-empresa {
                  width: 60%;
                  padding-left: 20mm;
                  padding-top: 13mm;
              }
              .talon-cobrador {
                  width: 60mm;
                  padding-left: 10mm;
                  padding-top: 16mm;
              }
              p {
                  margin-top: 5px;
                  font-size: 13px;
              }
          </style>
      </head>
      <body>
          <div class="contenedor">
              <div class="comprobante">
                  <div class="talon-empresa">
                      <p><strong>Empresa:</strong> ${razonSocial}</p>
                      <p><strong>Domicilio:</strong> ${empresaData.domicilio}</p>
                      <p><strong>Categoría / Monto:</strong> ${empresaData.categoria} / $${totalPagar}</p>
                      <p><strong>Período:</strong> ${mesesPagadosStr}</p>
                      <p><strong>Cobrador:</strong> ${empresaData.cobrador}</p>
                      <p>Por consultas comunicarse al 03564-15205778</p>
                  </div>
                  <div class="talon-cobrador">
                      <p><strong>Empresa:</strong> ${razonSocial}</p>
                      <p><strong>Categoría / Monto:</strong> ${empresaData.categoria} / $${totalPagar}</p>
                      <p><strong>Período:</strong> ${mesesPagadosStr}</p>
                      <p><strong>Cobrador:</strong> ${empresaData.cobrador}</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '', 'width=600,height=400');
    ventana.document.write(comprobanteHTML);
    ventana.document.close();
    ventana.print();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.modalContent}>
          <p>Cargando datos de la empresa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.modalContent}>
          <p style={styles.errorMessage}>{error}</p>
          <button style={styles.cancelButton} onClick={cerrarModal}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {modalVisible ? (
        <div style={styles.modalContent}>
          <h1 style={styles.title}>Modal de Pagos</h1>
          <p style={styles.subtitle}>Empresa: {razonSocial}</p>
          {fechaUnion && <p style={styles.subtitle}>Fecha de alta: {formatDate(fechaUnion)}</p>}

          {error && <p style={styles.errorMessage}>{error}</p>}

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Mes</th>
                  <th style={styles.th}>Seleccionar</th>
                </tr>
              </thead>
              <tbody>
                {meses.map((mes) => (
                  <tr
                    key={mes.id}
                    style={
                      mesesPagados.includes(mes.id)
                        ? { backgroundColor: '#d3d3d3' }
                        : null
                    }
                  >
                    <td style={styles.td}>{mes.nombre}</td>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={mesesSeleccionados.includes(mes.id)}
                        onChange={() => handleSeleccionarMes(mes.id)}
                        style={styles.checkboxInput}
                        disabled={mesesPagados.includes(mes.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.selectAllContainer}>
            <input
              type="checkbox"
              checked={todosSeleccionados}
              onChange={handleSeleccionarTodos}
              style={styles.checkboxInput}
              disabled={mesesPagados.length === meses.length}
            />
            <label style={styles.selectAllLabel}>Todos los meses disponibles</label>
            <h2 style={styles.totalAmount}>Total a pagar: ${totalPagar}</h2>
          </div>
          <div style={styles.buttonsContainer}>
            <button style={styles.cancelButton} onClick={cerrarModal}>Cancelar</button>
            <button 
              style={styles.payButton} 
              onClick={handleRealizarPago}
              disabled={mesesSeleccionados.length === 0}
            >
              Realizar Pago
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.successMessage}>
          <h2 style={styles.successMessageh2}>¡Pago realizado con éxito!</h2>
          <div style={styles.buttonsContainer}>
            <button style={styles.cancelButton} onClick={cerrarModal}>Cerrar</button>
            <button 
              style={styles.receiptButton} 
              onClick={handleImprimirComprobante}
              disabled={mesesSeleccionados.length === 0}
            >
              Generar Comprobante
            </button>
          </div>
        </div>
      )}
    </div>
  );
};




























// Estilos (igual que en el ModalPagos original)
const styles = {
  container: { 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0, 0, 0, 0.5)", 
    position: "fixed", 
    top: 0, 
    left: 0, 
    width: "100%", 
    height: "100vh",
    zIndex: 1000 
  },

  modalContent: { 
    backgroundColor: "#fff", 
    padding: "2.5rem", 
    borderRadius: "25px", 
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)", 
    width: "90%", 
    maxWidth: "400px", 
    height:"75vh",
    minHeight:"70vh",
    textAlign: "center",
  },

  title: { 
    fontSize: "1.65rem", 
    fontWeight: "550", 
    color: "#4b4b4b",
    marginTop:"-15px"
  },

  subtitle: { 
    fontSize: "1.2rem", 
    color: "#666", 
    marginBottom: "1rem",
  },

  tableContainer: { 
    maxHeight: "64%", 
    overflowY: "auto", 
  },

  table: { 
    width: "100%", 
    borderCollapse: "collapse" 
  },

  th: { 
    backgroundColor: "#0288d1", 
    color: "#fff", 
    padding: "12px 15px",
    textAlign:"center",
  },

  td: { 
    padding: "12px 15px", 
    textAlign: "center" 
  },

  checkboxInput: { 
    cursor: "pointer", 
    width: "20px", 
    height: "20px" 
  },

  selectAllContainer: { 
    marginTop: "10px", 
    textAlign: "left",
    display: "flex", 
    alignItems: "center", 
  },

  selectAllLabel: { 
    fontSize: "1rem", 
    color: "#333", 
    cursor: "pointer" 
  },

  totalAmount: {
    backgroundColor: "#bff5bd",
    color: "#333",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "1.1rem",
    fontWeight: "540",
    marginLeft: "auto", 
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)"
  },

  buttonsContainer: { 
    display: "flex", 
    justifyContent: "space-between", 
    marginTop: "1rem",
  },

  cancelButton: { 
    backgroundColor: "#e74c3c", 
    color: "#fff", 
    padding: "10px 20px", 
    borderRadius: "8px", 
    cursor: "pointer", 
    width: "48%", 
    border: "none", 
    outline: "none" 
  },

  payButton: { 
    backgroundColor: "#0288d1", 
    color: "#fff", 
    padding: "10px 20px", 
    borderRadius: "8px", 
    cursor: "pointer", 
    width: "48%", 
    border: "none", 
    outline: "none", 
  },

  successMessage: {
    width: "90%",  
    maxWidth: "500px", 
    textAlign: "center",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    backgroundColor: "#f9f9f9",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    margin: "auto",
  },

  successMessageh2: {
    marginBottom: "50px", 
    fontSize: "23px",  
    color: "#2c3e50",
  },

  receiptButton: { 
    backgroundColor: "#27AE60",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "6px",
    cursor: "pointer",
    width: "48%",
    border: "none",
    outline: "none",
    fontSize: "15px",
    fontWeight: "400",  
    fontFamily: "'Poppins', sans-serif",
    transition: "all 0.3s ease",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
  },

  errorMessage: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "0.5rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "500",
    margin: "10px auto",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)",
    width: "90%",
    marginBottom:"20px"
  },
};

export default ModalPagosEmpresas;