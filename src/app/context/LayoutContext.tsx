import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface LayoutContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const value = useMemo(
    () => ({
      isSidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((prev) => !prev),
      setSidebarCollapsed,
    }),
    [isSidebarCollapsed],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayoutState() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutState must be used within a LayoutProvider");
  }
  return context;
}
