import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faDollarSign, faTags, faSignOutAlt,
  faBuilding, faUserPlus, faFileInvoiceDollar, faRobot
} from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "../../assets/logo_lalcec.jpeg";
import "./Principal.css";

const PaginaPrincipal = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    localStorage.removeItem("ultimaBusqueda");
    localStorage.removeItem("ultimosResultados");
    localStorage.removeItem("socioSeleccionado");
    localStorage.removeItem("filtroSeleccionado");
    localStorage.removeItem("ultimaLetraSeleccionada");
    localStorage.removeItem("ultimoMedioPagoSeleccionado");
    localStorage.removeItem("ultimaAccion");
    localStorage.setItem("ultimaSeleccion", "Seleccionar");
  }, []);

  const handleCerrarSesion = () => setShowModal(true);

  const confirmarCierreSesion = () => {
    setIsExiting(true);
    setTimeout(() => {
      sessionStorage.clear();
      setShowModal(false);
      navigate("/", { replace: true });
    }, 400);
  };

  const menuItems = [
    { icon: faUsers, text: "Gestionar Socios", ruta: "/GestionarSocios" },
    { icon: faBuilding, text: "Gestionar Empresas", ruta: "/GestionarEmpresas" },
    { icon: faDollarSign, text: "Gestionar Cuotas", ruta: "/GestionarCuotas" },
    { icon: faTags, text: "Gestionar Categorías", ruta: "/GestionarCategorias" },
    { icon: faUserPlus, text: "Registro", ruta: "/registro" },
    { icon: faFileInvoiceDollar, text: "Contable", ruta: "/DashboardContable" },
    {
      icon: faRobot,
      text: "Panel del Bot",
      ruta: "https://lalcec.3devsnet.com/api/bot_wp/mensajeria_interna/panel_control.php",
      externa: true,
      className: "bot-panel"
    }
  ];

  return (
    <div className={`pagina-principal-container ${isExiting ? "slide-fade-out" : ""}`}>
      <div className="pagina-principal-card">
        <div className="pagina-principal-header">
          <div className="logo-container">
            <img src={logoLalcec} alt="Logo LALCEC" className="logo" />
          </div>
          <h1 className="title">Sistema de Gestión LALCEC</h1>
          <p className="subtitle">Panel de administración</p>
        </div>

        <div className="menu-container">
          <div className="menu-grid">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className={`menu-button ${item.className || ""}`}
                onClick={() =>
                  item.externa
                    ? window.open(item.ruta, "_blank")
                    : navigate(item.ruta)
                }
              >
                <div className="button-icon">
                  <FontAwesomeIcon icon={item.icon} size="lg" />
                </div>
                <span className="button-text">{item.text}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="logout-button" onClick={handleCerrarSesion}>
          <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
          <span>Cerrar Sesión</span>
        </button>

        {/* === Footer con tu página === */}
        <footer className="pagina-principal-footer">
          © {new Date().getFullYear()} LALCEC |{" "}
          <a href="https://3devsnet.com" target="_blank" rel="noopener noreferrer">
            3devsnet.com
          </a>
        </footer>
      </div>

      {showModal && (
        <div
          className="logout-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
        >
          <div className="logout-modal-container logout-modal--danger">
            <div className="logout-modal__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </div>

            <h3 id="logout-modal-title" className="logout-modal-title logout-modal-title--danger">
              Confirmar cierre de sesión
            </h3>

            <p className="logout-modal-text">
              ¿Estás seguro de que deseas cerrar la sesión?
            </p>

            <div className="logout-modal-buttons">
              <button
                className="logout-btn logout-btn--ghost"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="logout-btn logout-btn--solid-danger"
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
