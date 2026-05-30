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
  // faComments, // oculto temporalmente
} from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "../../assets/logo_lalcec.jpeg";
import "./Principal.css";

const BOT_PANEL_VIEJO_URL =
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

  // Botón nuevo del panel React oculto temporalmente.
  // const irPanelBotNuevo = () => {
  //   navigate("/bot/panel");
  // };

  return (
    <div
      className={`pagina-principal-container ${
        isExiting ? "slide-fade-out" : ""
      }`}
    >
      <div className="pagina-principal-card">
        <header className="pagina-principal-header">
          <div className="header-text-block">
            <h1 className="title">
              Sistema de{" "}
              <span className="title-highlight">Gestión LALCEC</span>
            </h1>

            <div className="header-divider" />
          </div>

          <div className="header-logo-block">
            <div className="logo-container">
              <img src={logoLalcec} alt="Logo LALCEC" className="logo" />
            </div>
          </div>
        </header>

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

      {/* BOTÓN VIEJO: panel PHP anterior */}
      <a
        href={BOT_PANEL_VIEJO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="bot-floating-btn"
        aria-label="Panel viejo del Bot LALCEC"
        title="Panel viejo del Bot"
      >
        <FontAwesomeIcon icon={faRobot} className="bot-floating-btn-icon" />
      </a>

      {/* BOTÓN NUEVO: panel React nuevo - OCULTO TEMPORALMENTE
      <button
        type="button"
        onClick={irPanelBotNuevo}
        aria-label="Panel nuevo del Bot LALCEC"
        title="Panel nuevo del Bot"
        style={{
          position: "fixed",
          right: "24px",
          bottom: "96px",
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 14px 30px rgba(234, 88, 12, .35)",
          zIndex: 999,
        }}
      >
        <FontAwesomeIcon icon={faComments} />
      </button>
      */}

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