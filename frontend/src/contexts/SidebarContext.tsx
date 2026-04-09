import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type SidebarContextType = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  sidebarSlot: ReactNode | null;
  setSidebarSlot: (node: ReactNode | null) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarSlot, setSidebarSlot] = useState<ReactNode | null>(null);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, sidebarSlot, setSidebarSlot }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
