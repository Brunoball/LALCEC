import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import BASE_URL from "../../config/config";

const AgregarEmpresa = () => {
  const [empresa, setEmpresa] = useState({
    razon_social: "",
    cuit: "",
    cond_iva: "",
    domicilio: "",
    domicilio_2: "",
    telefono: "",
    email: "",
    observacion: "",
    idCategoria: "",
    idMedios_Pago: "",
  });

  const [categorias, setCategorias] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [mensaje, setMensaje] = useState({ text: "", type: "" });
  const [condicionesIVA, setCondicionesIVA] = useState([]);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api.php?action=obtener_datos_empresas`);
        const data = await response.json();

        if (data.categorias && data.mediosPago && data.condicionesIVA) {
          setCategorias(data.categorias);
          setMediosPago(data.mediosPago);
          setCondicionesIVA(data.condicionesIVA);
        } else {
          setMensaje({ text: "No se encontraron datos.", type: "error" });
        }
      } catch (error) {
        setMensaje({ text: "Error al obtener los datos: " + error.message, type: "error" });
        setTimeout(() => setMensaje({ text: "", type: "" }), 5000);
      }
    };

    fetchDatos();
  }, []);



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmpresa({ ...empresa, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=agregar_empresa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(empresa),
        }
      );

      const data = await response.json();

      if (data.success_message) {
        setMensaje({ text: data.success_message, type: "success" });
        setEmpresa({
          razon_social: "",
          cuit: "",
          cond_iva: "",
          domicilio: "",
          domicilio_2: "",
          telefono: "",
          email: "",
          observacion: "",
          idCategoria: "",
          idMedios_Pago: "",
        });
      } else {
        setMensaje({ text: data.error_message, type: "error" });
      }

      setTimeout(() => setMensaje({ text: "", type: "" }), 5000);
    } catch (error) {
      setMensaje({ text: "Error al agregar empresa: " + error.message, type: "error" });
      setTimeout(() => setMensaje({ text: "", type: "" }), 5000);
    }
  };



  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        {mensaje.text && (
          <div style={mensaje.type === "success" ? styles.successMessage : styles.errorMessage}>
            {mensaje.text}
          </div>
        )}
        <h2 style={styles.title}>Agregar Empresa</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputRow}>
            <div style={styles.inputWrapper}>
              <input
                id="razon_social"
                type="text"
                name="razon_social"
                value={empresa.razon_social}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
              />
              <label
                htmlFor="razon_social"
                style={
                  empresa.razon_social
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                Razón Social
              </label>
            </div>

            <div style={styles.inputWrapper}>
              <input
                id="cuit"
                type="text"
                name="cuit"
                value={empresa.cuit}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
              />
              <label
                htmlFor="cuit"
                style={
                  empresa.cuit
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                CUIT
              </label>
            </div>
          </div>

          <div style={styles.inputRow}>

            <select
              id="cond_iva"
              name="cond_iva"
              value={empresa.cond_iva}
              onChange={handleInputChange}
              style={styles.select}
            >
              <option value="">Seleccione Condición IVA</option>
              {condicionesIVA.length > 0 ? (
                condicionesIVA.map((condicion) => (
                  <option key={condicion.id_iva} value={condicion.id_iva}>
                    {condicion.descripcion}
                  </option>
                ))
              ) : (
                <option value="" disabled>No hay condiciones de IVA disponibles</option>
              )}
            </select>
            

            <div style={styles.inputWrapper}>
              <input
                id="domicilio"
                type="text"
                name="domicilio"
                value={empresa.domicilio}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
              />
              <label
                htmlFor="domicilio"
                style={
                  empresa.domicilio
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                Domicilio
              </label>
            </div>
          </div>

          <div style={styles.inputRow}>
            <div style={styles.inputWrapper}>
              <input
                id="domicilio_2"
                type="text"
                name="domicilio_2"
                value={empresa.domicilio_2}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
              />
              <label
                htmlFor="domicilio_2"
                style={
                  empresa.domicilio_2
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                Domicilio de cobro
              </label>
            </div>

            <div style={styles.inputWrapper}>
              <input
                id="observacion"
                type="text"
                name="observacion"
                value={empresa.observacion}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
              />
              <label
                htmlFor="observacion"
                style={
                  empresa.observacion
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                Observación
              </label>
            </div>
          </div>

          <div style={styles.inputRow}>
            <div style={styles.inputWrapper}>
              <input
                id="email"
                type="email"
                name="email"
                value={empresa.email}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
              />
              <label
                htmlFor="email"
                style={
                  empresa.email
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                Email
              </label>
            </div>
            <div style={styles.inputWrapper}>
              <input
                id="telefono"
                type="text"
                name="telefono"
                value={empresa.telefono}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
              />
              <label
                htmlFor="telefono"
                style={
                  empresa.telefono
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                Teléfono
              </label>
            </div>
          </div>

          <div style={styles.inputRow}>
            <select
              name="idMedios_Pago"
              value={empresa.idMedios_Pago}
              onChange={handleInputChange}
              style={styles.select}
            >
              <option value="">Seleccione Medio de Pago</option>
              {mediosPago.map((medio) => (
                <option key={medio.IdMedios_pago} value={medio.IdMedios_pago}>
                  {medio.Medio_Pago}
                </option>
              ))}
            </select>

            <select
              name="idCategoria"
              value={empresa.idCategoria}
              onChange={handleInputChange}
              style={styles.select}
            >
              <option value="">Seleccione Categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.idCategorias} value={categoria.idCategorias}>
                  {categoria.Nombre_categoria} - ${categoria.Precio_Categoria}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.buttonsContainer}>
            <button type="submit" style={styles.saveButton}>
              <FontAwesomeIcon icon={faSave} />
              Agregar Empresa
            </button>
            <button
              type="button"
              onClick={handleGoBack}
              style={styles.backButton}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Volver Atrás
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    background: 'linear-gradient(135deg, #dcdcdc 30%, #ff6e00 70%)',
  },
  box: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '2.5rem',
    borderRadius: '25px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    width: '80%',
    maxWidth: '1000px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    transition: 'height 0.3s ease',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    color: '#4b4b4b',
    marginTop: '0',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  inputRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  inputWrapper: {
    position: 'relative',
    width: '48%',
  },
  input: {
    width: '100%',
    padding: '0.6rem',
    borderRadius: '10px',
    border: '1px solid #ccc',
    fontSize: '1.1rem',
    boxSizing: 'border-box',
    height: '45px',
  },
  floatingLabel: {
    position: 'absolute',
    top: '50%',
    left: '10px',
    transform: 'translateY(-50%)',
    fontSize: '1rem',
    color: '#aaa',
    transition: '0.2s ease all',
    pointerEvents: 'none',
  },
  floatingLabelActive: {
    top: '0px',
    fontSize: '0.9rem',
    color: '#0288d1',
    backgroundColor: '#fff',
    padding: '0 3px',
  },
  select: {
    width: '48%',
    padding: '0.6rem',
    borderRadius: '10px',
    border: '1px solid #ccc',
    fontSize: '1.1rem',
    boxSizing: 'border-box',
    height: '45px',
    backgroundColor: '#fff',
  },
  buttonsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '1.5rem',
  },
  saveButton: {
    background: 'linear-gradient(135deg, #ff8800, #ff6e00)',
    color: 'white',
    padding: '1rem',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    height: '50px',
    gap: '8px',
  },
  backButton: {
    backgroundColor: '#0288d1',
    color: 'white',
    padding: '1rem',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    height: '50px',
    gap: '8px',
  },
  successMessage: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
    padding: '1rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    width: '98%',
    textAlign: 'center',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
    marginTop: '-2rem',
    alignSelf: 'center',
    transition: 'opacity 0.3s ease',
  },
  errorMessage: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#F44336',
    padding: '1rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    width: '98%',
    textAlign: 'center',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
    marginTop: '-2rem',
    alignSelf: 'center',
    transition: 'opacity 0.3s ease',
  },
};

export default AgregarEmpresa;