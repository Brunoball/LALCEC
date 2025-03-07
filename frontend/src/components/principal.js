
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faDollarSign, faTags, faSignOutAlt, faBuilding, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "./logo_lalcec.jpeg";

const PaginaPrincipal = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Reiniciar todas las búsquedas y selecciones almacenadas
    localStorage.removeItem("ultimaBusqueda");
    localStorage.removeItem("ultimosResultados");
    localStorage.removeItem("socioSeleccionado");
    localStorage.removeItem("filtroSeleccionado");
    localStorage.removeItem("ultimaLetraSeleccionada");
    localStorage.removeItem("ultimoMedioPagoSeleccionado");
    localStorage.removeItem("ultimaAccion");
  
    // Asegurar que la opción inicial sea "Seleccionar"
    localStorage.setItem("ultimaSeleccion", "Seleccionar");
  }, []);
  

  const handleRedireccionarSocios = () => {
    navigate("/GestionarSocios");
  };

  const handleRedireccionarEmpresas = () => {
    navigate("/GestionarEmpresas");
  };

  const handleRedireccionarCuotas = () => {
    navigate("/GestionarCuotas");
  };

  const handleRedireccionarCategorias = () => {
    navigate("/GestionarCategorias");
  };

  const handleRedireccionarRegistro = () => {
    navigate("/registro");
  };

  const handleCerrarSesion = () => {
    setShowModal(true);
  };

  const confirmarCierreSesion = () => {
    sessionStorage.clear(); // Borra la sesión
  
    // Previene regresar a la página anterior
    window.history.pushState(null, null, "/");
    window.onpopstate = function () {
      window.history.go(1);
    };
  
    // Redirige y recarga la página para limpiar datos
    window.location.href = "/";
  };


  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.avatar}>
          <img src={logoLalcec} alt="Logo LALCEC" style={styles.avatarImage} />
        </div>
        <h2 style={styles.title}>Bienvenido a LALCEC</h2>

        <button style={styles.button} onClick={handleRedireccionarSocios}>
          <FontAwesomeIcon icon={faUsers} style={styles.iconButton} />
          <span style={styles.buttonText}>Gestionar Socios</span>
        </button>

        
        <button style={styles.button} onClick={handleRedireccionarEmpresas}>
          <FontAwesomeIcon icon={faBuilding} style={styles.iconButton} />
          <span style={styles.buttonText}>Gestionar Empresas</span>
        </button>

        <button style={styles.button} onClick={handleRedireccionarCuotas}>
          <FontAwesomeIcon icon={faDollarSign} style={styles.iconButton} />
          <span style={styles.buttonText}>Gestionar Cuotas</span>
        </button>

        <button style={styles.button} onClick={handleRedireccionarCategorias}>
          <FontAwesomeIcon icon={faTags} style={styles.iconButton} />
          <span style={styles.buttonText}>Gestionar Categorías</span>
        </button>

        <button style={styles.button} onClick={handleRedireccionarRegistro}>
          <FontAwesomeIcon icon={faUserPlus} style={styles.iconButton} />
          <span style={styles.buttonText}>Registro</span>
        </button>

        <button style={styles.logoutButton} onClick={handleCerrarSesion}>
          <FontAwesomeIcon icon={faSignOutAlt} style={styles.iconButton} />
          <span style={styles.buttonText}>Cerrar Sesión</span>
        </button>
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <p style={styles.modaltext}> ¿Estás seguro de que quieres cerrar sesión?</p>
            <button style={styles.modalButton} onClick={confirmarCierreSesion}>Sí</button>
            <button style={styles.modalButtonCancel} onClick={() => setShowModal(false)}>No</button>
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
    height: "100vh",
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(135deg, #dcdcdc 30%, #ff6e00 70%)",
  },
  box: {
    background: "rgba(255, 255, 255, 0.95)",
    padding: "2.5rem",
    borderRadius: "25px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    textAlign: "center",
    width: "350px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    background: "linear-gradient(135deg, #ff8800, #ff6e00)",
    borderRadius: "50%",
    width: "100px",
    height: "100px",
    margin: "-70px auto 20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "50px",
    color: "white",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "120%",
    height: "120%",
    objectFit: "cover",
    objectPosition: "center",
    transform: "scale(1.2)",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    color: "#4b4b4b",
  },
  button: {
    background: "linear-gradient(135deg, #ff8800, #ff6e00)",
    color: "white",
    padding: "1rem",
    border: "none",
    borderRadius: "15px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s ease",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "1rem",
    width: "100%",
    maxWidth: "300px",
    height: "50px",
  },
  logoutButton: {
    background: "red",
    color: "white",
    padding: "1rem",
    border: "none",
    borderRadius: "15px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s ease",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginTop: "1rem",
    width: "100%",
    maxWidth: "300px",
    height: "50px",
  },
  iconButton: {
    fontSize: "1.2rem",
  },
  buttonText: {
    fontSize: "1rem",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.5)", // Fondo oscuro semi-transparente
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    padding: "2rem",
    borderRadius: "10px",
    textAlign: "center",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    width: "300px",
  },

  modaltext: {
    fontSize:"20px",
  },

  modalButton: {
    background: "green",
    color: "white",
    padding: "0.8rem 2rem",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    margin: "10px",
    marginTop:"20px"
  },
  modalButtonCancel: {
    background: "red",
    color: "white",
    padding: "0.8rem 2rem",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    margin: "10px",
  },
};

export default PaginaPrincipal;
