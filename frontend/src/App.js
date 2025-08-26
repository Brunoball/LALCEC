// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";

import Inicio from "./components/login/inicio";
import Registro from "./components/login/Registro";
import PaginaPrincipal from "./components/PaginaPrincipal/Principal";
import GestionarCategorias from "./components/Gestionarcategoria/GestionarCategorias";
import GestionarCuotas from "./components/Gestionarcuota/GestionarCuotas";
import DashboardContable from "./components/Contable/DashboardContable";
import AgregarSocio from "./components/socios/Agregarsocio";
import AgregarEmpresa from "./components/Empresas/AgregarEmpresa";
import EditarSocio from "./components/socios/EditarSocio";
import EditarEmpresa from "./components/Empresas/EditarEmpresa";

// ⬇️ IMPORTS CORREGIDOS (carpeta modalcuotas)
import ModalPagos from "./components/Gestionarcuota/modalcuotas/ModalPagos";
import ModalPagosEmpresas from "./components/Gestionarcuota/modalcuotas/ModalPagosEmpresas";

import AgregarCategoria from "./components/Gestionarcategoria/agregar_categoria";
import EditarCategoria from "./components/Gestionarcategoria/editar_categoria";
import GestionarSocios from "./components/socios/GestionarSocios";
import GestionarEmpresas from "./components/Empresas/GestionarEmpresas";
import SociosBaja from "./components/socios/SociosBaja";
// >>> NUEVO: pantalla de empresas dadas de baja
import EmpresasBaja from "./components/Empresas/EmpresasBaja";

/* =========================================================
   🔒 Cierre de sesión por inactividad (global)
   - Cambiá INACTIVITY_MINUTES para ajustar el tiempo.
   - Escucha mouse, teclado, scroll, toques y visibilidad.
   - Solo corre cuando hay token y NO estás en "/".
========================================================= */
const INACTIVITY_MINUTES = 60;   
const INACTIVITY_MS = INACTIVITY_MINUTES * 60 * 1000;


function InactivityLogout() {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    let timerId = null;

    const hasToken = () => {
      try {
        return !!localStorage.getItem("token");
      } catch {
        return false;
      }
    };

    const doLogout = (reason = "inactivity") => {
      try {
        sessionStorage.clear();
      } catch {}
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
      } catch {}

      // Opcional: podés mostrar un aviso con sessionStorage si querés
      // sessionStorage.setItem("logout_reason", reason);

      navigate("/", { replace: true });
    };

    const resetTimer = () => {
      if (!hasToken()) return; // si no hay sesión, no corras
      if (location.pathname === "/") return; // en login no tiene sentido
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => doLogout("inactivity"), INACTIVITY_MS);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click"
    ];

    const onActivity = () => resetTimer();

    // También manejar pestaña oculta/visible
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };

    // Instalar listeners
    activityEvents.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    // Disparar al montar si aplica
    resetTimer();

    // Limpiar
    return () => {
      if (timerId) clearTimeout(timerId);
      activityEvents.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [location, navigate]);

  return null; // No renderiza UI
}

const App = () => {
  return (
    <BrowserRouter>
      {/* ⬇️ Activá el cierre por inactividad en toda la app */}
      <InactivityLogout />

      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/registro" element={<Registro />} />

        <Route path="/PaginaPrincipal" element={<PaginaPrincipal />} />
        {/* alias para el redirect que hace Inicio */}
        <Route path="/panel" element={<PaginaPrincipal />} />

        <Route path="/GestionarCuotas" element={<GestionarCuotas />} />
        <Route path="/GestionarCategorias" element={<GestionarCategorias />} />
        <Route path="/DashboardContable" element={<DashboardContable />} />

        <Route path="/AgregarSocio" element={<AgregarSocio />} />
        <Route path="/AgregarEmpresa" element={<AgregarEmpresa />} />

        <Route path="/editarSocio/:id" element={<EditarSocio />} />
        <Route path="/editarEmpresa/:razon_social" element={<EditarEmpresa />} />

        {/* Rutas de modales (si también querés poder abrirlos como página) */}
        <Route path="/modalPagos/:nombre/:apellido" element={<ModalPagos />} />
        <Route path="/ModalPagosEmpresas/:razon_social" element={<ModalPagosEmpresas />} />

        <Route path="/agregar_categoria" element={<AgregarCategoria />} />
        <Route path="/editar_categoria/:nombre_categoria" element={<EditarCategoria />} />

        <Route path="/GestionarSocios" element={<GestionarSocios />} />
        <Route path="/GestionarEmpresas" element={<GestionarEmpresas />} />

        <Route path="/socios_baja" element={<SociosBaja />} />
        {/* >>> NUEVO: ruta para empresas dadas de baja */}
        <Route path="/empresas_baja" element={<EmpresasBaja />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
