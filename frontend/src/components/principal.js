import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faDollarSign, faTags, faSignOutAlt, faBuilding, faUserPlus, faFileInvoiceDollar } from "@fortawesome/free-solid-svg-icons";
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
  
  const handleRedireccionarSocios = () => navigate("/GestionarSocios");
  const handleRedireccionarEmpresas = () => navigate("/GestionarEmpresas");
  const handleRedireccionarCuotas = () => navigate("/GestionarCuotas");
  const handleRedireccionarCategorias = () => navigate("/GestionarCategorias");
  const handleRedireccionarRegistro = () => navigate("/registro");
  const handleRedireccionarContable = () => navigate("/DashboardContable");

  const handleCerrarSesion = () => setShowModal(true);

  const confirmarCierreSesion = () => {
    sessionStorage.clear();
    window.history.pushState(null, null, "/");
    window.onpopstate = function() {
      window.history.go(1);
    };
    window.location.href = "/";
  };

  const menuItems = [
    { icon: faUsers, text: "Gestionar Socios", action: handleRedireccionarSocios },
    { icon: faBuilding, text: "Gestionar Empresas", action: handleRedireccionarEmpresas },
    { icon: faDollarSign, text: "Gestionar Cuotas", action: handleRedireccionarCuotas },
    { icon: faTags, text: "Gestionar Categorías", action: handleRedireccionarCategorias },
    { icon: faUserPlus, text: "Registro", action: handleRedireccionarRegistro },
    { icon: faFileInvoiceDollar, text: "Contable", action: handleRedireccionarContable }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img src={logoLalcec} alt="Logo LALCEC" style={styles.logo} />
          </div>
          <h1 style={styles.title}>Sistema de Gestión LALCEC</h1>
          <p style={styles.subtitle}>Panel de administración</p>
        </div>

        <div style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <button 
              key={index} 
              style={styles.menuButton}
              onClick={item.action}
            >
              <div style={styles.buttonIcon}>
                <FontAwesomeIcon icon={item.icon} size="lg" />
              </div>
              <span style={styles.buttonText}>{item.text}</span>
            </button>
          ))}
        </div>

        <button style={styles.logoutButton} onClick={handleCerrarSesion}>
          <FontAwesomeIcon icon={faSignOutAlt} style={styles.logoutIcon} />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Confirmar cierre de sesión</h3>
            <p style={styles.modalText}>¿Estás seguro de que deseas cerrar la sesión?</p>
            <div style={styles.modalButtons}>
              <button style={styles.modalButtonCancel} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button style={styles.modalButtonConfirm} onClick={confirmarCierreSesion}>
                Confirmar
              </button>
            </div>
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
    minHeight: "100vh",
    padding: "0 28px", // Cambiado para solo tener padding horizontal
    fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    background: "linear-gradient(135deg, #cccccc 30%, #ff6e00 70%)",
    boxSizing: "border-box", // Añade esto para que el padding no afecte las dimensiones
  },  
  
  card: {
    width: "100%",
    maxWidth: "900px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
    padding: "30px",
    margin: "auto", // Añade esto para asegurar el centrado
  },

  header: {
    textAlign: "center",
    marginBottom: "40px",
  },
  logoContainer: {
    width: "120px",
    height: "120px",
    margin: "0 auto 20px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    border: "3px solid #ff6e00",
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#2d3748",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#718096",
    margin: "0",
  },
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  menuButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "25px 15px",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    color: "#4a5568",
    textDecoration: "none",
    '&:hover': {
      transform: "translateY(-3px)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      borderColor: "#ff6e00",
      backgroundColor: "#fffaf5",
    },
  },
  buttonIcon: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#fff4e6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "15px",
    color: "#ff6e00",
    fontSize: "20px",
  },
  buttonText: {
    fontSize: "16px",
    fontWeight: "500",
    textAlign: "center",
  },
  logoutButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "12px",
    backgroundColor: "#fff",
    border: "1px solid #e53e3e",
    borderRadius: "8px",
    color: "#e53e3e",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s ease",
    '&:hover': {
      backgroundColor: "#fff5f5",
    },
  },
  logoutIcon: {
    fontSize: "16px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "30px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "15px",
    color: "#2d3748",
  },
  modalText: {
    fontSize: "16px",
    color: "#4a5568",
    marginBottom: "25px",
    lineHeight: "1.5",
  },
  modalButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
  },
  modalButtonCancel: {
    padding: "10px 20px",
    backgroundColor: "#fff",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    color: "#4a5568",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    '&:hover': {
      backgroundColor: "#f7fafc",
    },
  },
  modalButtonConfirm: {
    padding: "10px 20px",
    backgroundColor: "#e53e3e",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    '&:hover': {
      backgroundColor: "#c53030",
    },
  },
};

export default PaginaPrincipal;