// PaginaPrincipal.js (Código React con clases CSS)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faDollarSign, faTags, faSignOutAlt, faBuilding, faUserPlus, faFileInvoiceDollar } from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "../../assets/logo_lalcec.jpeg";
import "./Principal.css"; // Importa el archivo CSS

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
    navigate("/GestionarSocios", {
      state: { desdePrincipal: true }
    });
  };

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
    <div className="pagina-principal-container">
      <div className="pagina-principal-card">
        <div className="pagina-principal-header">
          <div className="logo-container">
            <img src={logoLalcec} alt="Logo LALCEC" className="logo" />
          </div>
          <h1 className="title">Sistema de Gestión LALCEC</h1>
          <p className="subtitle">Panel de administración</p>
        </div>

        <div className="menu-grid">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className="menu-button"
              onClick={item.action}
            >
              <div className="button-icon">
                <FontAwesomeIcon icon={item.icon} size="lg" />
              </div>
              <span className="button-text">{item.text}</span>
            </button>
          ))}
        </div>

        <button className="logout-button" onClick={handleCerrarSesion}>
          <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {showModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal-container">
            <h3 className="logout-modal-title">Confirmar cierre de sesión</h3>
            <p className="logout-modal-text">¿Estás seguro de que deseas cerrar la sesión?</p>
            <div className="logout-modal-buttons">
              <button 
                className="logout-modal-cancel-btn" 
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="logout-modal-confirm-btn" 
                onClick={confirmarCierreSesion}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaginaPrincipal;
