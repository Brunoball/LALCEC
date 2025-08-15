import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faArrowLeft,
  faEdit,
  faTrash,
  faTimes,
  faFilter,
  faChevronDown,
  faMagnifyingGlass,
  faInfoCircle,
  faUserMinus,
  faBuilding,
  faFileExcel,
} from "@fortawesome/free-solid-svg-icons";
import "./GestionarEmpresas.css";
import ModalEliminarEmpresa from "./modales_emp/ModalEliminarEmpresa";
import ModalInfoEmpresa from "./modales_emp/ModalInfoEmpresa";
import ModalBajaEmpresa from "./modales_emp/ModalBajaEmpresa";
import BASE_URL from "../../config/config";
import Toast from "../global/Toast";

// Hook: click fuera
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
};

const getEmpresaId = (e) =>
  e?.id ?? e?.idEmp ?? e?.id_empresa ?? e?.idEmpresa ?? null;

const GestionarEmpresas = () => {
  const navigate = useNavigate();

  // Data base
  const [empresas, setEmpresas] = useState([]);
  const [mediosDePago, setMediosDePago] = useState([]);

  // UI / estado
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [empresaABaja, setEmpresaABaja] = useState(null);
  const [infoEmpresa, setInfoEmpresa] = useState(null);

  // Errores, carga y toasts
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarToast, setMostrarToast] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");
  const [toastTipo, setToastTipo] = useState("exito");

  // Filtros locales
  const [busqueda, setBusqueda] = useState("");
  const [empresasFiltradas, setEmpresasFiltradas] = useState([]);
  const [mostrarMenuFiltros, setMostrarMenuFiltros] = useState(false);
  const [mostrarSubmenuAlfabetico, setMostrarSubmenuAlfabetico] = useState(false);
  const [mostrarSubmenuTransferencia, setMostrarSubmenuTransferencia] =
    useState(false);
  const [animacionCascada, setAnimacionCascada] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [actualizar, setActualizar] = useState(false);

  const [filtrosActivos, setFiltrosActivos] = useState({
    letras: [],
    mediosPago: [],
    todos: false,
    hasFilters: false,
  });

  // modales
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [mostrarModalBaja, setMostrarModalBaja] = useState(false);

  // otros
  const [mesesPagados, setMesesPagados] = useState([]);
  const filtrosRef = useRef(null);
  useClickOutside(filtrosRef, () => {
    if (mostrarMenuFiltros) {
      setMostrarMenuFiltros(false);
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  });

  // Util pago
  const getEstadoPago = (mesesPagadosStr, fechaUnionStr) => {
    if (!fechaUnionStr) return "emp_rojo";
    const mesesPagadosArr =
      mesesPagadosStr?.split(",").map((m) => m.trim().toUpperCase()) || [];
    const MESES_ANIO = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
    ];
    const fechaUnion = new Date(
      fechaUnionStr?.includes?.("T")
        ? fechaUnionStr
        : `${fechaUnionStr}T00:00:00-03:00`
    );
    const fechaHoy = new Date();
    const añoUnion = fechaUnion.getFullYear();
    const mesUnion = fechaUnion.getMonth();
    const añoHoy = fechaHoy.getFullYear();
    const mesHoy = fechaHoy.getMonth();

    const mesesEsperados = [];
    for (let año = añoUnion; año <= añoHoy; año++) {
      const desde = año === añoUnion ? mesUnion : 0;
      const hasta = año === añoHoy ? mesHoy : 11;
      for (let mes = desde; mes <= hasta; mes++) {
        mesesEsperados.push(MESES_ANIO[mes]);
      }
    }
    const deuda = mesesEsperados.filter((mes) => !mesesPagadosArr.includes(mes)).length;
    if (deuda === 0) return "emp_verde";
    if (deuda <= 2) return "emp_amarillo";
    return "emp_rojo";
  };

  // Cargar filtros guardados
  useEffect(() => {
    const savedFilters = localStorage.getItem("empresasFilters");
    const savedSearch = localStorage.getItem("empresasSearchTerm");
    if (savedFilters) setFiltrosActivos(JSON.parse(savedFilters));
    if (savedSearch) setBusqueda(savedSearch);
  }, []);

  // Toast post-acción
  useEffect(() => {
    if (!primeraCarga && actualizar) {
      setToastMensaje("Operación realizada correctamente");
      setToastTipo("exito");
      setMostrarToast(true);
    }
  }, [actualizar, primeraCarga]);

  // Carga inicial
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const [mediosResponse, empresasResponse] = await Promise.all([
          fetch(`${BASE_URL}/api.php?action=obtener_datos_empresas`),
          fetch(`${BASE_URL}/api.php?action=todos_empresas&tipo=empresas`),
        ]);

        const mediosData = await mediosResponse.json();
        const empresasData = await empresasResponse.json();

        if (Array.isArray(mediosData.mediosPago)) {
          setMediosDePago(mediosData.mediosPago);
        }

        const lista = Array.isArray(empresasData.empresas)
          ? empresasData.empresas
          : [];
        setEmpresas(lista);

        // Restaurar filtros/búsqueda (solo local)
        const savedFilters = localStorage.getItem("empresasFilters");
        const savedSearch = localStorage.getItem("empresasSearchTerm");

        let base = [...lista];

        if (savedFilters) {
          const parsed = JSON.parse(savedFilters);
          setFiltrosActivos(parsed);
          if (parsed.letras.length > 0) {
            base = base.filter((empresa) =>
              parsed.letras.some((letra) =>
                (empresa.razon_social || "").toUpperCase().startsWith(letra)
              )
            );
          }
          if (parsed.mediosPago.length > 0) {
            base = base.filter((empresa) =>
              parsed.mediosPago.includes(empresa.medio_pago)
            );
          }
        }

        if (savedSearch && savedSearch.trim() !== "") {
          setBusqueda(savedSearch);
          base = base.filter((empresa) =>
            (empresa.razon_social || "")
              .toLowerCase()
              .includes(savedSearch.toLowerCase())
          );
        }

        setEmpresasFiltradas(base);
        setError(null);
        setDatosCargados(true);
      } catch (err) {
        console.error("Error:", err);
        setError("Error al cargar los datos iniciales");
      } finally {
        setCargando(false);
        setPrimeraCarga(false);
      }
    };

    cargarDatosIniciales();
  }, [actualizar]);

  // ======== FILTRADO LOCAL ========
  const aplicarFiltradoLocal = (listaBase, filtros, textoBusqueda) => {
    let resultado = [...listaBase];

    if (filtros.letras.length > 0) {
      resultado = resultado.filter((empresa) =>
        filtros.letras.some((letra) =>
          (empresa.razon_social || "").toUpperCase().startsWith(letra)
        )
      );
    }
    if (filtros.mediosPago.length > 0) {
      resultado = resultado.filter((empresa) =>
        filtros.mediosPago.includes(empresa.medio_pago)
      );
    }
    if ((textoBusqueda || "").trim() !== "") {
      const q = textoBusqueda.toLowerCase();
      resultado = resultado.filter((empresa) =>
        (empresa.razon_social || "").toLowerCase().includes(q)
      );
    }
    return resultado;
  };

  // Reaplicar filtros
  useEffect(() => {
    if (!datosCargados) return;
    const res = aplicarFiltradoLocal(empresas, filtrosActivos, busqueda);
    setEmpresasFiltradas(res);
  }, [filtrosActivos, empresas, datosCargados, busqueda]);

  const toggleMenuFiltros = () => {
    setMostrarMenuFiltros(!mostrarMenuFiltros);
    if (mostrarMenuFiltros) {
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  };
  const toggleSubmenu = (submenu) => {
    switch (submenu) {
      case "alfabetico":
        setMostrarSubmenuAlfabetico(!mostrarSubmenuAlfabetico);
        setMostrarSubmenuTransferencia(false);
        break;
      case "transferencia":
        setMostrarSubmenuTransferencia(!mostrarSubmenuTransferencia);
        setMostrarSubmenuAlfabetico(false);
        break;
      default:
        break;
    }
  };

  // Buscar (local)
  const handleBusquedaInputChange = (e) => {
    const value = e.target.value;
    setBusqueda(value);
    localStorage.setItem("empresasSearchTerm", value);
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };
  const handleBusqueda = () => {
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };
  const handleClearSearch = () => {
    setBusqueda("");
    localStorage.removeItem("empresasSearchTerm");
    const res = aplicarFiltradoLocal(empresas, filtrosActivos, "");
    setEmpresasFiltradas(res);
  };

  const handleFiltrarPorLetra = (letra) => {
    const newLetras = filtrosActivos.letras.includes(letra)
      ? filtrosActivos.letras.filter((l) => l !== letra)
      : [...filtrosActivos.letras, letra];

    const newFilters = {
      ...filtrosActivos,
      letras: newLetras,
      todos: false,
      hasFilters: newLetras.length > 0 || filtrosActivos.mediosPago.length > 0,
    };

    setFiltrosActivos(newFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(newFilters));
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };

  const handleFiltrarPorMedioPago = (medio) => {
    const newMedios = filtrosActivos.mediosPago.includes(medio)
      ? filtrosActivos.mediosPago.filter((m) => m !== medio)
      : [...filtrosActivos.mediosPago, medio];

    const newFilters = {
      ...filtrosActivos,
      mediosPago: newMedios,
      todos: false,
      hasFilters: newMedios.length > 0 || filtrosActivos.letras.length > 0,
    };

    setFiltrosActivos(newFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(newFilters));
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };

  const eliminarFiltroLetra = (letra) => {
    const newLetras = filtrosActivos.letras.filter((l) => l !== letra);
    const newFilters = {
      ...filtrosActivos,
      letras: newLetras,
      todos: false,
      hasFilters: newLetras.length > 0 || filtrosActivos.mediosPago.length > 0,
    };
    setFiltrosActivos(newFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(newFilters));
  };

  const eliminarFiltroMedioPago = (medio) => {
    const newMedios = filtrosActivos.mediosPago.filter((m) => m !== medio);
    const newFilters = {
      ...filtrosActivos,
      mediosPago: newMedios,
      todos: false,
      hasFilters: newMedios.length > 0 || filtrosActivos.letras.length > 0,
    };
    setFiltrosActivos(newFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(newFilters));
  };

  const limpiarFiltros = () => {
    const reset = { letras: [], mediosPago: [], todos: false, hasFilters: false };
    setFiltrosActivos(reset);
    localStorage.setItem("empresasFilters", JSON.stringify(reset));
    setEmpresasFiltradas(aplicarFiltradoLocal(empresas, reset, busqueda));
  };

  const handleMostrarTodos = () => {
    const allFilters = { letras: [], mediosPago: [], todos: true, hasFilters: false };
    setFiltrosActivos(allFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(allFilters));
    setEmpresasFiltradas(empresas);
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };

  // Navegación
  const handleVolverAtras = () => {
    localStorage.removeItem("empresasFilters");
    localStorage.removeItem("empresasSearchTerm");
    navigate("/PaginaPrincipal");
  };
  const handleAgregarEmpresa = () => {
    navigate("/AgregarEmpresa");
    setActualizar((p) => !p);
  };

  // Tabla / tarjetas acciones
  const handleFilaSeleccionada = (index, empresa) => {
    setFilaSeleccionada(filaSeleccionada === index ? null : index);
    setEmpresaSeleccionada(empresa);
  };

  const handleEditarEmpresa = (razonSocial) => {
    navigate(`/editarEmpresa/${razonSocial}`);
    setActualizar((p) => !p);
  };

  const handleConfirmarEliminar = (empresa) => {
    setEmpresaSeleccionada(empresa);
    setMostrarModalEliminar(true);
  };

  const handleEliminarEmpresa = async () => {
    if (!empresaSeleccionada) return;
    try {
      const url = `${BASE_URL}/api.php?action=eliminar_empresa&idEmp=${empresaSeleccionada.idEmp}&razon_social=${encodeURIComponent(
        empresaSeleccionada.razon_social
      )}`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();
      if (data.success) {
        setEmpresas((prev) => prev.filter((e) => e.idEmp !== empresaSeleccionada.idEmp));
        setEmpresasFiltradas((prev) =>
          prev.filter((e) => e.idEmp !== empresaSeleccionada.idEmp)
        );
        setMostrarModalEliminar(false);
        setToastMensaje("Empresa eliminada correctamente");
        setToastTipo("exito");
        setMostrarToast(true);
      } else {
        setToastMensaje(data.message || "Error al eliminar la empresa.");
        setToastTipo("error");
        setMostrarToast(true);
      }
    } catch (error) {
      console.error("Error al eliminar empresa:", error);
      setToastMensaje("Hubo un problema al eliminar la empresa.");
      setToastTipo("error");
      setMostrarToast(true);
    }
  };

  // ====== BAJA EMPRESA ======
  const handleConfirmarBajaEmpresa = (empresa) => {
    setEmpresaABaja(empresa);
    setMostrarModalBaja(true);
  };

  const handleConfirmarBajaEmpresaSubmit = async (empresa, motivo) => {
    const id = getEmpresaId(empresa);
    const m = (motivo || "").trim();
    if (!id || !m) {
      setToastMensaje("Motivo requerido para dar de baja.");
      setToastTipo("error");
      setMostrarToast(true);
      return;
    }
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=estado_empresa&op=dar_baja`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_empresa: id, motivo: m }),
        }
      );
      const result = await response.json();
      if (response.ok && (result?.success || result?.exito)) {
        setEmpresas((prev) => prev.filter((e) => getEmpresaId(e) !== id));
        setEmpresasFiltradas((prev) => prev.filter((e) => getEmpresaId(e) !== id));
        setMostrarModalBaja(false);
        setEmpresaABaja(null);
        setToastMensaje(result?.mensaje || "Empresa dada de baja");
        setToastTipo("exito");
        setMostrarToast(true);
      } else {
        setToastMensaje(result?.mensaje || "No se pudo dar de baja");
        setToastTipo("error");
        setMostrarToast(true);
      }
    } catch (e) {
      setToastMensaje("Problema al dar de baja");
      setToastTipo("error");
      setMostrarToast(true);
    }
  };

  const handleMostrarInfoEmpresa = (empresa) => {
    setCargando(true);
    try {
      const mesesP = empresa.meses_pagados
        ? empresa.meses_pagados.split(",").map((m) => m.trim().toUpperCase())
        : [];
      setInfoEmpresa(empresa);
      setMesesPagados(mesesP);
      setMostrarModalInfo(true);
    } catch (error) {
      console.error("Error al procesar información:", error);
      setErrorMessage(`Error: ${error.message}`);
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setCargando(false);
    }
  };

  // Exportar Excel (solo visibles)
  const exportarAExcel = () => {
    const visibles = empresasFiltradas;
    if (!visibles || visibles.length === 0) {
      setToastMensaje("No hay datos para exportar");
      setToastTipo("error");
      setMostrarToast(true);
      return;
    }
    const validas = visibles.filter(
      (emp) =>
        emp &&
        emp.razon_social &&
        emp.cuit &&
        emp.descripcion_iva &&
        emp.domicilio_2 &&
        emp.medio_pago
    );
    if (validas.length === 0) {
      setToastMensaje("No hay datos válidos para exportar a Excel");
      setToastTipo("error");
      setMostrarToast(true);
      return;
    }
    const nombreArchivo = "Empresas.xlsx";
    const datosReordenados = validas.map(({ idEmpresas, nombre, ...resto }) => resto);
    const ws = XLSX.utils.json_to_sheet(datosReordenados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empresas");
    XLSX.writeFile(wb, nombreArchivo);

    setToastMensaje("Exportación a Excel completada");
    setToastTipo("exito");
    setMostrarToast(true);
  };

  const aplicarFiltroAlfabetico = (letra) => {
    handleFiltrarPorLetra(letra);
    setMostrarSubmenuAlfabetico(false);
  };
  const aplicarFiltroTransferencia = (medio) => {
    handleFiltrarPorMedioPago(medio);
    setMostrarSubmenuTransferencia(false);
  };

  const cantidadVisibles =
    (filtrosActivos.todos ||
      filtrosActivos.letras.length > 0 ||
      filtrosActivos.mediosPago.length > 0 ||
      busqueda.trim() !== "")
      ? empresasFiltradas.length
      : 0;

  return (
    <div className="emp_empresa-container">
      <div className="emp_empresa-box">
        {/* HEADER */}
        <div className="emp_front-row-emp">
          <span className="emp_empresa-title">Gestionar Empresas</span>

          {/* Búsqueda */}
          <div className="emp_search-input-container">
            <input
              id="search"
              type="text"
              placeholder="Buscar por nombre"
              className="emp_search-input"
              value={busqueda}
              onChange={handleBusquedaInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleBusqueda()}
            />
            {busqueda && (
              <FontAwesomeIcon
                icon={faTimes}
                className="emp_clear-search-icon"
                onClick={handleClearSearch}
                title="Limpiar búsqueda"
              />
            )}
            <button className="emp_search-button" onClick={handleBusqueda} title="Buscar">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="emp_search-icon" />
            </button>
          </div>

          {/* Filtros */}
          <div className="emp_filtros-container" ref={filtrosRef}>
            <button className="emp_filtros-button" onClick={toggleMenuFiltros}>
              <FontAwesomeIcon icon={faFilter} className="emp_icon-button" />
              <span>Aplicar Filtros</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`emp_chevron-icon ${mostrarMenuFiltros ? "emp_rotate" : ""}`}
              />
            </button>

            {mostrarMenuFiltros && (
              <div className="emp_filtros-menu">
                <div
                  className="emp_filtros-menu-item"
                  onClick={() => toggleSubmenu("alfabetico")}
                >
                  <span>Filtrar de la A a la Z</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`emp_chevron-icon ${
                      mostrarSubmenuAlfabetico ? "emp_rotate" : ""
                    }`}
                  />
                </div>

                {mostrarSubmenuAlfabetico && (
                  <div className="emp_filtros-submenu">
                    <div className="emp_alfabeto-filtros">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letra) => (
                        <button
                          key={letra}
                          className={`emp_letra-filtro ${
                            filtrosActivos.letras.includes(letra) ? "emp_active" : ""
                          }`}
                          onClick={() => aplicarFiltroAlfabetico(letra)}
                          title={`Filtrar por ${letra}`}
                        >
                          {letra}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className="emp_filtros-menu-item"
                  onClick={() => toggleSubmenu("transferencia")}
                >
                  <span>Medios de Pago</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`emp_chevron-icon ${
                      mostrarSubmenuTransferencia ? "emp_rotate" : ""
                    }`}
                  />
                </div>

                {mostrarSubmenuTransferencia && (
                  <div className="emp_filtros-submenu">
                    {mediosDePago.map((medio) => {
                      const label = medio.Medio_Pago || String(medio);
                      return (
                        <div
                          key={label}
                          className={`emp_filtros-submenu-item ${
                            filtrosActivos.mediosPago.includes(label) ? "emp_active" : ""
                          }`}
                          onClick={() => aplicarFiltroTransferencia(label)}
                          title={`Filtrar por ${label}`}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  className="emp_filtros-menu-item emp_mostrar-todas"
                  onClick={() => {
                    handleMostrarTodos();
                    setMostrarMenuFiltros(false);
                  }}
                >
                  <span>Mostrar Todas</span>
                </div>
              </div>
            )}
          </div>

          <div className="emp_front-row">{error && <p className="emp_error">{error}</p>}</div>

          {/* Resumen filtros */}
          <div
            className={`emp_filtros-activos-container ${
              filtrosActivos.letras.length > 0 || filtrosActivos.mediosPago.length > 0
                ? "emp_show"
                : ""
            }`}
          >
            {(filtrosActivos.letras.length > 0 ||
              filtrosActivos.mediosPago.length > 0) && (
              <div className="emp_filtros-activos">
                <div className="emp_filtros-activos-header">
                  <span>Filtros aplicados:</span>
                </div>

                <button className="emp_limpiar-filtros-btn" onClick={limpiarFiltros}>
                  Limpiar todos
                </button>

                <div className="emp_filtros-activos-chips">
                  {filtrosActivos.letras.map((letra, index) => (
                    <div key={`letra-${index}`} className="emp_filtro-chip">
                      <span>Letra: {letra}</span>
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="emp_filtro-chip-close"
                        onClick={() => eliminarFiltroLetra(letra)}
                      />
                    </div>
                  ))}

                  {filtrosActivos.mediosPago.map((medio, index) => (
                    <div key={`medio-${index}`} className="emp_filtro-chip">
                      <span>Medio: {medio}</span>
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="emp_filtro-chip-close"
                        onClick={() => eliminarFiltroMedioPago(medio)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {errorMessage && <div className="emp_error-message-emp">{errorMessage}</div>}

        {/* CONTADOR + LEYENDA + LISTADO */}
        <div className="emp_empresas-list">
          <div className="emp_contenedor-list-items">
            <div className="emp_contador-container">
              {/* Desktop: "Cant empresas: N"  |  Mobile: "Emp: N" */}
              <span className="emp_socios-totales emp_socios-desktop">
                Cant empresas: {cantidadVisibles}
              </span>
              <span className="emp_socios-totales emp_socios-mobile">
                Emp: {cantidadVisibles}
              </span>
              <FontAwesomeIcon icon={faBuilding} className="emp_icono-empresa" />
            </div>
            <div className="emp_estado-pagos-container">
              <div className="emp_estado-indicador emp_al-dia">
                <div className="emp_indicador-color"></div>
                <span>Al día</span>
              </div>
              <div className="emp_estado-indicador emp_debe-1-2">
                <div className="emp_indicador-color"></div>
                <span>Debe 1-2 meses</span>
              </div>
              <div className="emp_estado-indicador emp_debe-3-mas">
                <div className="emp_indicador-color"></div>
                <span>Debe 3+ meses</span>
              </div>
            </div>
          </div>

          {/* ======= TABLA (Desktop / por defecto) ======= */}
          <div className="emp_box-table">
            <div className="emp_header">
              <div className="emp_column-header emp_header-razon">Razón Social</div>
              <div className="emp_column-header emp_header-cuit">CUIT</div>
              <div className="emp_column-header emp_header-iva">Cond. IVA</div>
              <div className="emp_column-header emp_header-dom">Domicilio cobro</div>
              <div className="emp_column-header emp_header-obs">Observaciones</div>
              <div className="emp_column-header emp_header-medio">Medio de Pago</div>
              <div className="emp_column-header emp_icons-column">Acciones</div>
            </div>

            <div className="emp_body">
              {cargando ? (
                <div className="emp_loading-spinner-container">
                  <div className="emp_loading-spinner"></div>
                </div>
              ) : !datosCargados ? (
                <div className="emp_no-data-message">
                  <div className="emp_message-content">
                    <p>Cargando datos iniciales...</p>
                  </div>
                </div>
              ) : (filtrosActivos.todos ||
                  filtrosActivos.letras.length > 0 ||
                  filtrosActivos.mediosPago.length > 0 ||
                  busqueda.trim() !== "") &&
                empresasFiltradas.length > 0 ? (
                <div
                  className={`emp_scrollableE ${animacionCascada ? "emp_cascade-animation" : ""}`}
                >
                  {empresasFiltradas.map((empresa, index) => {
                    const estadoPago = getEstadoPago(
                      empresa.meses_pagados,
                      empresa.Fechaunion
                    );
                    const rowClass =
                      filaSeleccionada === index
                        ? `emp_selected-row ${estadoPago}`
                        : index % 2 === 0
                        ? `emp_even-row ${estadoPago}`
                        : `emp_odd-row ${estadoPago}`;

                    return (
                      <div
                        key={`${empresa.idEmp || empresa.cuit || index}`}
                        className={`emp_row ${rowClass}`}
                        onClick={() => handleFilaSeleccionada(index, empresa)}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="emp_column emp_column-razon">
                          {empresa.razon_social}
                        </div>
                        <div className="emp_column emp_column-cuit">{empresa.cuit}</div>
                        <div className="emp_column emp_column-iva">
                          {empresa.descripcion_iva}
                        </div>
                        <div className="emp_column emp_column-dom">
                          {empresa.domicilio_2}
                        </div>
                        <div className="emp_column emp_column-obs">
                          {empresa.observacion}
                        </div>
                        <div className="emp_column emp_column-medio">
                          {empresa.medio_pago}
                        </div>
                        <div className="emp_column emp_icons-column">
                          {filaSeleccionada === index && (
                            <div className="emp_icons-container">
                              <button
                                className="emp_icon emp_btn-info"
                                title="Ver información"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMostrarInfoEmpresa(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faInfoCircle} />
                              </button>

                              <button
                                className="emp_icon emp_btn-edit"
                                title="Editar empresa"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditarEmpresa(empresa.razon_social);
                                }}
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>

                              <button
                                className="emp_icon emp_btn-delete"
                                title="Eliminar empresa"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarEliminar(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>

                              <button
                                className="emp_icon emp_btn-baja"
                                title="Dar de baja"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarBajaEmpresa(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faUserMinus} />
                                <span className="emp_btn-baja-text"></span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="emp_no-data-message">
                  <div className="emp_message-content">
                    <p>Por favor aplicá búsqueda o filtros para ver las empresas</p>
                    <button className="emp_btn-show-all" onClick={handleMostrarTodos}>
                      Mostrar todas las empresas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======= TARJETAS (Mobile — ocultas en desktop por CSS) ======= */}
          <div className={`emp_cards-wrapper ${animacionCascada ? "emp_cascade-animation" : ""}`}>
            {cargando ? (
              <div className="emp_no-data-message emp_no-data-mobile">
                <div className="emp_message-content">
                  <p>Cargando datos iniciales...</p>
                </div>
              </div>
            ) : !datosCargados ? (
              <div className="emp_no-data-message emp_no-data-mobile">
                <div className="emp_message-content">
                  <p>Cargando datos iniciales...</p>
                </div>
              </div>
            ) : (filtrosActivos.todos ||
                filtrosActivos.letras.length > 0 ||
                filtrosActivos.mediosPago.length > 0 ||
                busqueda.trim() !== "") &&
              empresasFiltradas.length > 0 ? (
              empresasFiltradas.map((empresa, index) => {
                const estadoPago = getEstadoPago(
                  empresa.meses_pagados,
                  empresa.Fechaunion
                );
                return (
                  <div
                    className={`emp_card ${estadoPago}`}
                    key={`card-${empresa.idEmp || empresa.cuit || index}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => handleFilaSeleccionada(index, empresa)}
                  >
                    <div className="emp_card-status-strip" />
                    <div className="emp_card-header">
                      <h3 className="emp_card-title">{empresa.razon_social}</h3>
                      <span
                        className={`emp_badge ${
                          estadoPago === "emp_verde"
                            ? "emp_badge-success"
                            : estadoPago === "emp_amarillo"
                            ? "emp_badge-warn"
                            : "emp_badge-danger"
                        }`}
                      >
                        {estadoPago === "emp_verde"
                          ? "Al día"
                          : estadoPago === "emp_amarillo"
                          ? "Debe 1-2"
                          : "Debe 3+"}
                      </span>
                    </div>

                    <div className="emp_card-body">
                      <div className="emp_card-row">
                        <span className="emp_card-label">CUIT</span>
                        <span className="emp_card-value emp_mono">{empresa.cuit}</span>
                      </div>
                      <div className="emp_card-row">
                        <span className="emp_card-label">Cond. IVA</span>
                        <span className="emp_card-value">{empresa.descripcion_iva}</span>
                      </div>
                      <div className="emp_card-row">
                        <span className="emp_card-label">Domicilio cobro</span>
                        <span className="emp_card-value">{empresa.domicilio_2}</span>
                      </div>
                      {empresa.observacion && (
                        <div className="emp_card-row">
                          <span className="emp_card-label">Obs.</span>
                          <span className="emp_card-value">{empresa.observacion}</span>
                        </div>
                      )}
                      <div className="emp_card-row">
                        <span className="emp_card-label">Medio de Pago</span>
                        <span className="emp_card-value">{empresa.medio_pago}</span>
                      </div>
                    </div>

                    <div className="emp_card-actions">
                      <button
                        className="emp_action-btn"
                        title="Información"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMostrarInfoEmpresa(empresa);
                        }}
                      >
                        <FontAwesomeIcon icon={faInfoCircle} />
                      </button>
                      <button
                        className="emp_action-btn"
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditarEmpresa(empresa.razon_social);
                        }}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        className="emp_action-btn"
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmarEliminar(empresa);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      <button
                        className="emp_action-btn emp_action-danger"
                        title="Dar de baja"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmarBajaEmpresa(empresa);
                        }}
                      >
                        <FontAwesomeIcon icon={faUserMinus} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="emp_no-data-message emp_no-data-mobile">
                <div className="emp_message-content">
                  <p>Usá la búsqueda o aplica filtros para ver resultados</p>
                  <button className="emp_btn-show-all" onClick={handleMostrarTodos}>
                    Mostrar todas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTONERA INFERIOR */}
        <div className="emp_down-container">
          <button
            className="emp_socio-button emp_hover-effect emp_volver-atras"
            onClick={handleVolverAtras}
            id="Backnow"
            aria-label="Volver"
            title="Volver"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="emp_socio-icon-button" />
            <p>Volver Atrás</p>
          </button>

          <div className="emp_botones-container">
            <button
              className="emp_socio-button emp_hover-effect"
              onClick={handleAgregarEmpresa}
              aria-label="Agregar"
              title="Agregar empresa"
            >
              <FontAwesomeIcon icon={faPlus} className="emp_socio-icon-button" />
              <FontAwesomeIcon
                icon={faBuilding}
                className="emp_icono-empresa emp_icono-celular-empresa"
              />
              <p>Agregar Empresa</p>
            </button>

            <button
              className="emp_socio-button emp_hover-effect"
              onClick={exportarAExcel}
              aria-label="Exportar"
              title="Exportar a Excel"
            >
              <FontAwesomeIcon icon={faFileExcel} className="emp_socio-icon-button" />
              <p>Exportar a Excel</p>
            </button>

            <button
              className="emp_socio-button emp_hover-effect emp_btn-baja-nav"
              onClick={() => navigate("/empresas_baja")}
              title="Dados de Baja"
              aria-label="Dados de Baja"
            >
              <FontAwesomeIcon icon={faUserMinus} className="emp_socio-icon-button" />
              <p>Dados de Baja</p>
            </button>
          </div>
        </div>
      </div>

      {mostrarModalEliminar && (
        <ModalEliminarEmpresa
          empresaSeleccionada={empresaSeleccionada}
          onCancelar={() => setMostrarModalEliminar(false)}
          onEliminar={handleEliminarEmpresa}
        />
      )}

      {mostrarModalInfo && infoEmpresa && (
        <ModalInfoEmpresa
          infoEmpresa={infoEmpresa}
          mesesPagados={mesesPagados}
          onCerrar={() => setMostrarModalInfo(false)}
        />
      )}

      {mostrarModalBaja && empresaABaja && (
        <ModalBajaEmpresa
          empresa={empresaABaja}
          onCancelar={() => setMostrarModalBaja(false)}
          onConfirmar={handleConfirmarBajaEmpresaSubmit}
        />
      )}

      {mostrarToast && (
        <Toast
          tipo={toastTipo}
          mensaje={toastMensaje}
          onClose={() => setMostrarToast(false)}
          duracion={3000}
        />
      )}
    </div>
  );
};

export default GestionarEmpresas;
