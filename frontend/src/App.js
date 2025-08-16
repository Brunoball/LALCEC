// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

const App = () => {
  return (
    <BrowserRouter>
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
