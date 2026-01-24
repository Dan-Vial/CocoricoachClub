import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FieldModeContextType {
  fieldMode: boolean;
  setFieldMode: (enabled: boolean) => void;
  toggleFieldMode: () => void;
}

const FieldModeContext = createContext<FieldModeContextType | undefined>(undefined);

export function FieldModeProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [fieldMode, setFieldModeState] = useState(() => {
    const stored = localStorage.getItem("fieldMode");
    return stored === "true";
  });

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem("fieldMode", String(fieldMode));
    
    // Apply global class to document body for CSS targeting
    if (fieldMode) {
      document.documentElement.classList.add("field-mode");
      document.body.classList.add("field-mode");
    } else {
      document.documentElement.classList.remove("field-mode");
      document.body.classList.remove("field-mode");
    }
  }, [fieldMode]);

  const setFieldMode = (enabled: boolean) => {
    setFieldModeState(enabled);
  };

  const toggleFieldMode = () => {
    setFieldModeState((prev) => !prev);
  };

  return (
    <FieldModeContext.Provider value={{ fieldMode, setFieldMode, toggleFieldMode }}>
      {children}
    </FieldModeContext.Provider>
  );
}

export function useFieldMode() {
  const context = useContext(FieldModeContext);
  if (context === undefined) {
    throw new Error("useFieldMode must be used within a FieldModeProvider");
  }
  return context;
}
