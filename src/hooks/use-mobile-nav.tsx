'use client';

import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileNavContextValue {
  isMobile: boolean;
  showSidebar: boolean;
  showMemberList: boolean;
  showSettings: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openMemberList: () => void;
  closeMemberList: () => void;
  toggleMemberList: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  closeAll: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Sur mobile, fermer les panneaux quand on change de page
  useEffect(() => {
    if (!isMobile) {
      setShowSidebar(false);
      setShowMemberList(false);
    }
  }, [isMobile]);

  const openSidebar = useCallback(() => {
    setShowSidebar(true);
    setShowMemberList(false);
  }, []);

  const closeSidebar = useCallback(() => setShowSidebar(false), []);
  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
    setShowMemberList(false);
  }, []);

  const openMemberList = useCallback(() => {
    setShowMemberList(true);
    setShowSidebar(false);
  }, []);

  const closeMemberList = useCallback(() => setShowMemberList(false), []);
  const toggleMemberList = useCallback(() => {
    setShowMemberList(prev => !prev);
    setShowSidebar(false);
  }, []);

  const openSettings = useCallback(() => {
    setShowSettings(true);
    setShowSidebar(false);
    setShowMemberList(false);
  }, []);

  const closeSettings = useCallback(() => setShowSettings(false), []);

  const closeAll = useCallback(() => {
    setShowSidebar(false);
    setShowMemberList(false);
    setShowSettings(false);
  }, []);

  return (
    <MobileNavContext.Provider
      value={{
        isMobile,
        showSidebar,
        showMemberList,
        showSettings,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        openMemberList,
        closeMemberList,
        toggleMemberList,
        openSettings,
        closeSettings,
        closeAll,
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav(): MobileNavContextValue {
  const context = useContext(MobileNavContext);
  if (!context) {
    // Fallback pour composants hors du provider
    return {
      isMobile: false,
      showSidebar: false,
      showMemberList: false,
      showSettings: false,
      openSidebar: () => {},
      closeSidebar: () => {},
      toggleSidebar: () => {},
      openMemberList: () => {},
      closeMemberList: () => {},
      toggleMemberList: () => {},
      openSettings: () => {},
      closeSettings: () => {},
      closeAll: () => {},
    };
  }
  return context;
}
