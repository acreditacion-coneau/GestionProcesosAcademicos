import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, NavLink } from "react-router";
import { Check, ChevronDown, PanelLeft, Search, Shield, UserCircle, Wrench } from "lucide-react";
import { useUser } from "../context/UserContext";
import { NotificacionesBell } from "./NotificacionesBell";
import { LayoutProvider, useLayoutState } from "../context/LayoutContext";

const ROL_LABELS: Record<string, string> = {
  DOCENTE: "Docente",
  DOCENTE_RESPONSABLE: "Responsable de Cátedra",
  JEFE_CARRERA: "Jefe de Carrera",
  SECRETARIA: "Secretaría Académica",
  ADMINISTRATIVO: "Mesa de Ayuda",
  SEC_TECNICA: "Secretaría Técnica",
};

function LayoutInner() {
  const {
    user,
    personas,
    setPersonaIndex,
    isAdmin,
    selectedDesignacionId,
    setSelectedDesignacionId,
    selectedDesignacion,
  } = useUser();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutState();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchPersona, setSearchPersona] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const personasFiltradas = useMemo(() => {
    const query = searchPersona.trim().toLowerCase();
    if (!query) return personas;

    return personas.filter((persona) => {
      const rol = (ROL_LABELS[persona.rol] ?? persona.rol).toLowerCase();
      return (
        persona.nombre.toLowerCase().includes(query) ||
        persona.dni.includes(query) ||
        persona.carrera.toLowerCase().includes(query) ||
        rol.includes(query)
      );
    });
  }, [personas, searchPersona]);

  const designaciones = user.designaciones ?? [];
  const showDesignacionSelector =
    (user.rol === "DOCENTE" || user.rol === "DOCENTE_RESPONSABLE")
    && designaciones.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="bg-blue-900 text-white shadow-md sticky top-0 z-50">
        <div className="w-full px-4 md:px-8 lg:px-10 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={toggleSidebar}
              className="w-10 h-10 rounded-lg bg-blue-800 hover:bg-blue-700 border border-blue-700 flex items-center justify-center transition-colors"
              title={isSidebarCollapsed ? "Expandir menú lateral" : "Ocultar menú lateral"}
              aria-label={isSidebarCollapsed ? "Expandir menú lateral" : "Ocultar menú lateral"}
            >
              <PanelLeft className="w-5 h-5 text-white" />
            </button>

            <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                {user.rol === "ADMINISTRATIVO" ? (
                  <Wrench className="w-5 h-5 text-white" />
                ) : user.rol === "SECRETARIA" || user.rol === "JEFE_CARRERA" || user.rol === "SEC_TECNICA" ? (
                  <Shield className="w-5 h-5 text-white" />
                ) : (
                  <UserCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">Portal Docente</h1>
                <p className="text-blue-200 text-xs">Autogestión Académica</p>
              </div>
            </NavLink>
          </div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <div className="hidden lg:flex flex-col text-right gap-1.5">
              <span className="font-medium text-sm">{user.nombre}</span>
              <span className="text-blue-200 text-xs">
                {ROL_LABELS[user.rol] ?? user.rol} · {user.carrera === "Todas" ? "Todas las carreras" : user.carrera}
              </span>
              {showDesignacionSelector && (
                <div className="flex flex-col items-end gap-1">
                  <label className="text-[10px] uppercase tracking-wide text-blue-200/90">Asignatura activa</label>
                  <select
                    value={selectedDesignacionId ?? designaciones[0]?.id ?? ""}
                    onChange={(event) => setSelectedDesignacionId(event.target.value || null)}
                    className="max-w-[280px] bg-blue-800 border border-blue-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-400"
                  >
                    {designaciones.map((designacion, index) => (
                      <option key={designacion.id ?? `${designacion.asignatura}-${index}`} value={designacion.id ?? `${designacion.asignatura}-${index}`}>
                        {designacion.asignatura || "Sin asignatura"} · {designacion.rolSistema}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-blue-200/90">
                    Rol académico activo: {selectedDesignacion?.rolSistema ?? "docente"}
                  </span>
                </div>
              )}
            </div>

            <NotificacionesBell />

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-xl border border-blue-700 transition-colors"
                title="Cambiar vista de usuario"
              >
                <span>{isAdmin ? "Vista admin" : "Vista"}: {ROL_LABELS[user.rol] ?? user.rol}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Simular vista (rol)
                  </div>

                  <div className="px-3 py-2 border-b border-slate-100">
                    <label className="relative block">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchPersona}
                        onChange={(event) => setSearchPersona(event.target.value)}
                        placeholder="Buscar por nombre, DNI o rol..."
                        className="w-full text-xs pl-8 pr-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-400"
                      />
                    </label>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto">
                    {personasFiltradas.map((persona) => {
                      const isSelected = persona.dni === user.dni;
                      const originalIndex = personas.findIndex((p) => p.dni === persona.dni);

                      return (
                        <button
                          key={persona.dni}
                          onClick={() => {
                            if (originalIndex >= 0) {
                              setPersonaIndex(originalIndex);
                            }
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b border-slate-50 last:border-0 ${
                            isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                              {persona.nombre}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {ROL_LABELS[persona.rol] ?? persona.rol} · {persona.carrera}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 mt-1 shrink-0" />}
                        </button>
                      );
                    })}

                    {personasFiltradas.length === 0 && (
                      <div className="px-4 py-6 text-center text-xs text-slate-400">Sin resultados</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 md:px-8 lg:px-10 py-4 md:py-6 lg:py-8 relative z-0">
        <Outlet />
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 mt-auto">
        <div className="w-full px-4 md:px-8 lg:px-10 py-6 text-center text-slate-500 text-sm">
          &copy; 2026 FAUD - Sistema de Autogestión Docente
        </div>
      </footer>
    </div>
  );
}

export function Layout() {
  return (
    <LayoutProvider>
      <LayoutInner />
    </LayoutProvider>
  );
}
