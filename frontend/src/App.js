import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/inicio";
import Registro from "./components/registro"; // Asegúrate de que tienes el componente Registro
import PaginaPrincipal from "./components/principal"; 
import GestionarSocios from "./components/GestionarSocios"; // Asegúrate de crear esta página
import GestionarEmpresas from "./components/GestionarEmpresas"; 
import GestionarCuotas from "./components/GestionarCuotas";
import GestionarCategorias from "./components/GestionarCategorias";
import AgregarSocio from "./components/Agregarsocio"; // Asegúrate de crear esta página
import AgregarEmpresa from "./components/AgregarEmpresa"; // Asegúrate de crear esta página
import EditarSocio from "./components/EditarSocio"; // Página para editar un socio
import EditarEmpresa from "./components/EditarEmpresa"; // Página para editar un socio
import ModalPagos from "./components/ModalPagos"; // Asegúrate de importar ModalPagos
import ModalPagosEmpresas from "./components/ModalPagosEmpresas";
import AgregarCategoria from "./components/agregar_categoria"; 
import EditarCategoria from "./components/editar_categoria"; 
import DashboardContable from './components/DashboardContable';




const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} /> 
        <Route path="/registro" element={<Registro />} /> 

        <Route path="/PaginaPrincipal" element={<PaginaPrincipal />} />
        <Route path="/GestionarSocios" element={<GestionarSocios />} />
        <Route path="/GestionarEmpresas" element={<GestionarEmpresas />} />
        <Route path="/AgregarSocio" element={<AgregarSocio />} />
        <Route path="/AgregarEmpresa" element={<AgregarEmpresa />} />
        <Route path="/GestionarCuotas" element={<GestionarCuotas />} />
        <Route path="/GestionarCategorias" element={<GestionarCategorias />} />
        <Route path="/editarSocio/:nombre/:apellido" element={<EditarSocio />} />
        <Route path="/editarEmpresa/:razon_social" element={<EditarEmpresa />} />
        <Route path="/modalPagos/:nombre/:apellido" element={<ModalPagos />} /> 
        <Route path="/ModalPagosEmpresas/:razon_social" element={<ModalPagosEmpresas />} />
        <Route path="/agregar_categoria" element={<AgregarCategoria />} />
        <Route path="/editar_categoria/:nombre_categoria" element={<EditarCategoria />} />
        <Route path="/DashboardContable" element={<DashboardContable />} />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
