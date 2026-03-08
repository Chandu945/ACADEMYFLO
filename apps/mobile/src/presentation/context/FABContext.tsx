import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface FABContextType {
  isFABVisible: boolean;
  showFAB: () => void;
  hideFAB: () => void;
}

const FABContext = createContext<FABContextType>({
  isFABVisible: false,
  showFAB: () => {},
  hideFAB: () => {},
});

export function FABProvider({ children }: { children: React.ReactNode }) {
  const [isFABVisible, setVisible] = useState(false);

  const showFAB = useCallback(() => setVisible(true), []);
  const hideFAB = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({ isFABVisible, showFAB, hideFAB }),
    [isFABVisible, showFAB, hideFAB],
  );

  return <FABContext.Provider value={value}>{children}</FABContext.Provider>;
}

export function useFAB() {
  return useContext(FABContext);
}
