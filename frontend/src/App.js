// src/App.js
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

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

import ModalPagos from "./components/Gestionarcuota/modalcuotas/ModalPagos";
import ModalPagosEmpresas from "./components/Gestionarcuota/modalcuotas/ModalPagosEmpresas";

import AgregarCategoria from "./components/Gestionarcategoria/agregar_categoria";
import EditarCategoria from "./components/Gestionarcategoria/editar_categoria";
import GestionarSocios from "./components/socios/GestionarSocios";
import GestionarEmpresas from "./components/Empresas/GestionarEmpresas";
import SociosBaja from "./components/socios/SociosBaja";
import EmpresasBaja from "./components/Empresas/EmpresasBaja";

import BotPanel from "./components/BotPanel/BotPanel";
import notificationSound from "./components/BotPanel/notificacion/notificacion.mp3";

const BOT_BASE_URL = (
  process.env.REACT_APP_BOT_BASE_URL ||
  "https://lalcec.3devsnet.com/api/bot_whatshapp"
).replace(/\/+$/, "");

const PANEL_API = (
  process.env.REACT_APP_BOT_PANEL_URL ||
  `${BOT_BASE_URL}/funciones/Panel/endpoints`
).replace(/\/+$/, "");

const INACTIVITY_MINUTES = 60;
const INACTIVITY_MS = INACTIVITY_MINUTES * 60 * 1000;

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const calcularUrgentesDesdeChats = (rows) => {
  const chats = Array.isArray(rows) ? rows : [];
  let urgent = 0;

  for (const c of chats) {
    const consultasPendientes = Math.max(
      0,
      toNum(c?.consultas_pendientes || c?.pending_consultas || 0)
    );

    urgent += consultasPendientes;
  }

  return urgent;
};

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

    const doLogout = () => {
      try {
        sessionStorage.clear();
      } catch {}
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
      } catch {}

      navigate("/", { replace: true });
    };

    const resetTimer = () => {
      if (!hasToken()) return;
      if (location.pathname === "/") return;

      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(doLogout, INACTIVITY_MS);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const onActivity = () => resetTimer();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };

    const onStorage = (e) => {
      if (e.key === "token" || e.key === "usuario") {
        const hasAny =
          !!localStorage.getItem("token") || !!localStorage.getItem("usuario");

        if (!hasAny) doLogout();
      }
    };

    activityEvents.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);

    resetTimer();

    return () => {
      if (timerId) clearTimeout(timerId);
      activityEvents.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [location.pathname, navigate]);

  return null;
}

function GlobalUrgentBotNotifier() {
  const location = useLocation();

  const audioRef = React.useRef(null);
  const prevUrgentRef = React.useRef(0);
  const firstLoadRef = React.useRef(true);
  const interactedRef = React.useRef(false);

  React.useEffect(() => {
    const unlock = () => {
      interactedRef.current = true;
    };

    window.addEventListener("click", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  React.useEffect(() => {
    const hasSession = () => {
      try {
        return (
          !!localStorage.getItem("token") || !!localStorage.getItem("usuario")
        );
      } catch {
        return false;
      }
    };

    const playSound = () => {
      if (!interactedRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      try {
        audio.pause();
        audio.currentTime = 0;
        const p = audio.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    };

    const tick = async () => {
      if (!hasSession()) return;
      if (location.pathname === "/") return;

      try {
        const res = await fetch(`${PANEL_API}/panel_chats.php?_=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) return;

        const urgent = calcularUrgentesDesdeChats(data.chats);

        if (firstLoadRef.current) {
          firstLoadRef.current = false;
          prevUrgentRef.current = urgent;
          return;
        }

        if (urgent > prevUrgentRef.current) {
          playSound();
        }

        prevUrgentRef.current = urgent;
      } catch {
        // silencio
      }
    };

    tick();
    const interval = setInterval(tick, 2000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  return <audio ref={audioRef} preload="auto" src={notificationSound} />;
}

const App = () => {
  return (
    <BrowserRouter>
      <InactivityLogout />
      <GlobalUrgentBotNotifier />

      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/registro" element={<Registro />} />

        <Route path="/PaginaPrincipal" element={<PaginaPrincipal />} />
        <Route path="/panel" element={<PaginaPrincipal />} />

        <Route path="/bot/panel" element={<BotPanel />} />

        <Route path="/GestionarCuotas" element={<GestionarCuotas />} />
        <Route path="/GestionarCategorias" element={<GestionarCategorias />} />
        <Route path="/DashboardContable" element={<DashboardContable />} />

        <Route path="/AgregarSocio" element={<AgregarSocio />} />
        <Route path="/AgregarEmpresa" element={<AgregarEmpresa />} />

        <Route path="/editarSocio/:id" element={<EditarSocio />} />
        <Route path="/editarEmpresa/:razon_social" element={<EditarEmpresa />} />

        <Route path="/modalPagos/:nombre/:apellido" element={<ModalPagos />} />
        <Route
          path="/ModalPagosEmpresas/:razon_social"
          element={<ModalPagosEmpresas />}
        />

        <Route path="/agregar_categoria" element={<AgregarCategoria />} />
        <Route path="/editar_categoria/:nombre_categoria" element={<EditarCategoria />} />

        <Route path="/GestionarSocios" element={<GestionarSocios />} />
        <Route path="/GestionarEmpresas" element={<GestionarEmpresas />} />

        <Route path="/socios_baja" element={<SociosBaja />} />
        <Route path="/empresas_baja" element={<EmpresasBaja />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;