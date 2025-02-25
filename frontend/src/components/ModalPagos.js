import React, { useState, useEffect } from 'react';

const ModalPagos = ({ nombre, apellido, cerrarModal }) => {
  const [mesesSeleccionados, setMesesSeleccionados] = useState([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [precioMensual, setPrecioMensual] = useState(0); // Estado para el precio mensual
  const [modalVisible, setModalVisible] = useState(true); // Estado para controlar la visibilidad del modal
  const [error, setError] = useState(''); // Estado para almacenar mensaje de error

  useEffect(() => {
    const obtenerMontoMensual = async () => {
      try {
        const response = await fetch("http://localhost:3001/Monto_pago.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, apellido })
        });
        const result = await response.json();
        if (result.success) {
          setPrecioMensual(result.precioMes);
        } else {
          setError(result.message);
          // Después de 3 segundos, borrar el mensaje de error
          setTimeout(() => setError(''), 3000);
        }
      } catch (error) {
        setError("Ocurrió un error al obtener el monto mensual.");
        // Después de 3 segundos, borrar el mensaje de error
        setTimeout(() => setError(''), 3000);
      }
    };
    obtenerMontoMensual();
  }, [nombre, apellido]);
  
  
  // Calcular el total a pagar basado en los meses seleccionados
  const totalPagar = mesesSeleccionados.length * precioMensual;

  const meses = [...Array(12)].map((_, i) => ({ 
    id: i + 1, 
    nombre: new Date(0, i).toLocaleString('es', { month: 'long' }).toUpperCase() 
  }));

  const handleSeleccionarMes = (mes) => {
    setMesesSeleccionados(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const handleSeleccionarTodos = () => {
    setMesesSeleccionados(todosSeleccionados ? [] : meses.map(mes => mes.id));
    setTodosSeleccionados(!todosSeleccionados);
  };

  const handleRealizarPago = async () => {
    try {
      const response = await fetch("http://localhost:3001/registrar_pagos.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, meses: mesesSeleccionados })
      });
      const result = await response.json();
      if (result.success) {
        setPagoExitoso(true); // Cambiar el estado para mostrar el mensaje de éxito
        setModalVisible(false); // Ocultar el modal
      } else {
        setError(result.message); // Establecer el mensaje de error
        // Hacer que el mensaje de error desaparezca después de 3 segundos
        setTimeout(() => {
          setError('');
        }, 3000);
      }
    } catch (error) {
      setError("Ocurrió un error al realizar el pago."); // Establecer mensaje de error
      // Hacer que el mensaje de error desaparezca después de 3 segundos
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  const handleImprimirComprobante = async () => {
    try {
        const response = await fetch("http://localhost:3001/comprobante_pago.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, apellido })
        });

        const result = await response.json();

        if (!result.success) {
            alert("Error al obtener los datos del socio: " + result.message);
            return;
        }

        const { domicilio, numero, categoria, cobrador, precioCategoria } = result;

        const mesesPagados = meses
            .filter(m => mesesSeleccionados.includes(m.id))
            .map(m => m.nombre)
            .join(", ");

        const comprobanteHTML = `
            <html>
            <head>
                <title>Comprobante de Pago</title>
                <style>
                    @page {
                        size: A4 portrait; /* Hoja A4 en vertical */
                        margin: 0;
                    }
                    body {
                        width: 210mm; /* Ancho de la hoja A4 */
                        height: 297mm; /* Alto de la hoja A4 */
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .contenedor {
                      width: 210mm; /* Ancho del comprobante */
                      height: 70mm; /* Alto del comprobante */
                      position: absolute;
                      top: 33%; /* Centra verticalmente */
                      left: 50%; /* Centra horizontalmente */
                      transform: translate(-50%, -50%) rotate(90deg); /* Centrado y rotación */
                      transform-origin: center center; /* Punto de origen de la rotación */
                      box-sizing: border-box;
                    }
                    .comprobante {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        box-sizing: border-box;
                    }
                    .talon-socio {
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
                        <div class="talon-socio">
                            <p><strong>Afiliado:</strong> ${nombre} ${apellido}</p>
                            <p><strong>Domicilio:</strong> ${domicilio} ${numero}</p>
                            <p><strong>Categoría / Monto:</strong> ${categoria} / $${totalPagar}</p>
                            <p><strong>Período:</strong> ${mesesPagados}</p>
                            <p><strong>Cobrador:</strong> ${cobrador}</p>
                            <p>Por consultas comunicarse al 03564-15205778</p>
                        </div>
                        <div class="talon-cobrador">
                            <p><strong>Nombre y Apellido:</strong> ${nombre} ${apellido}</p>
                            <p><strong>Categoría / Monto:</strong> ${categoria} / $${totalPagar}</p>
                            <p><strong>Período:</strong> ${mesesPagados}</p>
                            <p><strong>Cobrador:</strong> ${cobrador}</p>
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

    } catch (error) {
        alert("Ocurrió un error al obtener los datos del socio.");
    }
  };


  return (
    <div style={styles.container}>
      {modalVisible ? (
        <div style={styles.modalContent}>
          <h1 style={styles.title}>Modal de Pagos</h1>
          <p style={styles.subtitle}>Socio: {nombre} {apellido}</p>

          {error && <p style={styles.errorMessage }>{error}</p>} {/* Mostrar mensaje de error */}

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
                  <tr key={mes.id}>
                    <td style={styles.td}>{mes.nombre}</td>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={mesesSeleccionados.includes(mes.id)}
                        onChange={() => handleSeleccionarMes(mes.id)}
                        style={styles.checkboxInput}
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
            />
            <label style={styles.selectAllLabel}>Todos los meses</label>
            <h2 style={styles.totalAmount}>Total a pagar: ${totalPagar}</h2>
          </div>
          <div style={styles.buttonsContainer}>
            <button style={styles.cancelButton} onClick={cerrarModal}>Cancelar</button>
            <button style={styles.payButton} onClick={handleRealizarPago}>Realizar Pago</button>
          </div>
          
        </div>
      ) : (
        <div style={styles.successMessage}>
          <h2 style={styles.successMessageh2}>¡Pago realizado con éxito!</h2>
          <div style={styles.buttonsContainer}>
            <button style={styles.cancelButton} onClick={cerrarModal}>Cerrar</button>
            <button style={styles.receiptButton} onClick={handleImprimirComprobante}>Generar Comprobante</button>
          </div>
        </div>
      )}
    </div>
  );
};




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
    display: "flex", // Para alinear los elementos en una fila
    alignItems: "center", // Alinear verticalmente al centro
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
    marginLeft: "auto", // Mueve el totalAmount a la derecha
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
    width: "90%",  // Usar un porcentaje para el ancho
    maxWidth: "420px", // Máximo ancho para no hacer el contenedor demasiado grande en pantallas grandes
    textAlign: "center",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    backgroundColor: "#f9f9f9",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    margin: "auto",
  },

  successMessageh2: {
    marginBottom: "50px", // Reducir margen para pantallas pequeñas
    fontSize: "23px",  // Ajustar el tamaño del texto
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
      fontWeight: "400",  // Letra más fina
      fontFamily: "'Poppins', sans-serif",
      transition: "all 0.3s ease",
      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
  },

  cancelButton: { 
      backgroundColor: "#e74c3c",
      color: "#fff",
      padding: "8px 18px",
      borderRadius: "6px",
      cursor: "pointer",
      width: "48%",
      border: "none",
      outline: "none",
      fontSize: "15px",
      fontWeight: "500",  // Letra más fina
      fontFamily: "'Poppins', sans-serif",
      transition: "all 0.3s ease",
      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
  },

  // Efecto Hover
  receiptButtonHover: {
      backgroundColor: "#219150",
      transform: "scale(1.05)",
      boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.3)",
  },

  cancelButtonHover: {
      backgroundColor: "#c0392b",
      transform: "scale(1.05)",
      boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.3)",
  },

  // Efecto Active (cuando se presiona)
  receiptButtonActive: {
      transform: "scale(0.95)",
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
  },

  cancelButtonActive: {
      transform: "scale(0.95)",
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
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

export default ModalPagos;
