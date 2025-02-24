import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/inicio";
import Registro from "./components/registro"; // Asegúrate de que tienes el componente Registro
import PaginaPrincipal from "./components/principal"; 
import GestionarSocios from "./components/GestionarSocios"; // Asegúrate de crear esta página
import GestionarCuotas from "./components/GestionarCuotas";
import GestionarCategorias from "./components/GestionarCategorias";
import AgregarSocio from "./components/Agregarsocio"; // Asegúrate de crear esta página
import EditarSocio from "./components/EditarSocio"; // Página para editar un socio
import ModalPagos from "./components/ModalPagos"; // Asegúrate de importar ModalPagos
import AgregarCategoria from "./components/agregar_categoria"; 
import EditarCategoria from "./components/editar_categoria"; 

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} /> 
        <Route path="/registro" element={<Registro />} /> 

        <Route path="/PaginaPrincipal" element={<PaginaPrincipal />} />
        <Route path="/GestionarSocios" element={<GestionarSocios />} />
        <Route path="/AgregarSocio" element={<AgregarSocio />} />
        <Route path="/GestionarCuotas" element={<GestionarCuotas />} />
        <Route path="/GestionarCategorias" element={<GestionarCategorias />} />
        <Route path="/editarSocio/:nombre/:apellido" element={<EditarSocio />} />
        <Route path="/modalPagos/:nombre/:apellido" element={<ModalPagos />} /> {/* Ruta para el modal de pagos */}
        <Route path="/agregar_categoria" element={<AgregarCategoria />} />
        <Route path="/editar_categoria/:nombre_categoria" element={<EditarCategoria />} />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
