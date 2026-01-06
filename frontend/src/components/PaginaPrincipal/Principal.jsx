import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faDollarSign,
  faTags,
  faSignOutAlt,
  faBuilding,
  faUserPlus,
  faFileInvoiceDollar,
  faRobot,
} from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "../../assets/logo_lalcec.jpeg";
import "./Principal.css";

const BOT_PANEL_URL =
  "https://lalcec.3devsnet.com/api/bot_wp/mensajeria_interna/panel_control.php";

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
      try {
        sessionStorage.clear();
      } catch {}
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
      } catch {}
      setShowModal(false);
      navigate("/", { replace: true });
    }, 400);
  };

  // 🔹 Solo las tarjetas internas (sin Panel del Bot)
  const menuItems = [
    { icon: faUsers, text: "Gestionar Socios", ruta: "/GestionarSocios" },
    { icon: faBuilding, text: "Gestionar Empresas", ruta: "/GestionarEmpresas" },
    { icon: faDollarSign, text: "Gestionar Cuotas", ruta: "/GestionarCuotas" },
    { icon: faTags, text: "Gestionar Categorías", ruta: "/GestionarCategorias" },
    { icon: faUserPlus, text: "Registro", ruta: "/registro" },
    { icon: faFileInvoiceDollar, text: "Contable", ruta: "/DashboardContable" },
  ];

  const handleItemClick = (item) => {
    navigate(item.ruta);
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  };

  return (
    <div
      className={`pagina-principal-container ${
        isExiting ? "slide-fade-out" : ""
      }`}
    >
      <div className="pagina-principal-card">
        {/* ===== HEADER TIPO MAQUETA ===== */}
        <header className="pagina-principal-header">
          <div className="header-text-block">
            <h1 className="title">
              Sistema de{" "}
              <span className="title-highlight">Gestión LALCEC</span>
            </h1>

            {/* si querés, acá podés volver a poner el subtítulo */}
            {/* <p className="subtitle">Panel de administración integral</p> */}

            <div className="header-divider" />

            {/* Si después querés el “Bienvenido, b”, va acá */}
            {/* 
            <div className="welcome-row">
              <span className="welcome-label">Bienvenido,</span>
              <span className="user-pill">b</span>
            </div>
            */}
          </div>

          <div className="header-logo-block">
            <div className="logo-container">
              <img src={logoLalcec} alt="Logo LALCEC" className="logo" />
            </div>
          </div>
        </header>

        {/* ===== TARJETAS (2 filas x 3) ===== */}
        <section className="menu-section">
          <div className="menu-grid">
            {menuItems.map((item, index) => (
              <button
                type="button"
                key={index}
                className="menu-button"
                onClick={() => handleItemClick(item)}
                aria-label={item.text}
              >
                <div className="button-icon">
                  <FontAwesomeIcon icon={item.icon} size="lg" />
                </div>
                <span className="button-text">{item.text}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ===== BOTÓN CERRAR SESIÓN ===== */}
        <div className="logout-row">
          <button
            type="button"
            className="logout-button"
            onClick={handleCerrarSesion}
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
            <span className="logout-text-full">Cerrar Sesión</span>
          </button>
        </div>

        <footer className="pagina-principal-footer">
          Desarrollado por{" "}
          <a
            href="https://3devsnet.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            3devs.solutions
          </a>
        </footer>
      </div>

      {/* ===== BOTÓN FLOTANTE TIPO WHATSAPP (NARANJA) ===== */}
      <a
        href={BOT_PANEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="bot-floating-btn"
        aria-label="Panel del Bot LALCEC"
      >
        <FontAwesomeIcon icon={faRobot} className="bot-floating-btn-icon" />
      </a>

      {/* ===== MODAL LOGOUT ===== */}
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

            <h3
              id="logout-modal-title"
              className="logout-modal-title logout-modal-title--danger"
            >
              Confirmar cierre de sesión
            </h3>

            <p className="logout-modal-text">
              ¿Estás seguro de que deseas cerrar la sesión?
            </p>

            <div className="logout-modal-buttons">
              <button
                type="button"
                className="logout-btn logout-btn--ghost"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
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
