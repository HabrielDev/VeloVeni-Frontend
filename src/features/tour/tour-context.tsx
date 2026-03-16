import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

import { TOUR_STEPS } from "./tour-steps";

const STORAGE_KEY = "vv-tour-v1";

interface TourStorageState {
  seen: boolean;
  enabled: boolean;
}

function readStorage(): TourStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return { seen: false, enabled: true };

    return JSON.parse(raw) as TourStorageState;
  } catch {
    return { seen: false, enabled: true };
  }
}

function writeStorage(state: TourStorageState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  shouldAutoStart: boolean;
  tourEnabled: boolean;
  next: () => void;
  skip: () => void;
  startTour: () => void;
  setTourEnabled: (enabled: boolean) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<TourStorageState>(readStorage);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setStorage((prev) => {
      const updated = { ...prev, seen: true };

      writeStorage(updated);

      return updated;
    });
  }, []);

  const next = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      endTour();
    }
  }, [currentStep, endTour]);

  const skip = useCallback(() => {
    endTour();
  }, [endTour]);

  const setTourEnabled = useCallback((enabled: boolean) => {
    setStorage((prev) => {
      const updated: TourStorageState = { seen: enabled ? false : prev.seen, enabled };

      writeStorage(updated);

      return updated;
    });
  }, []);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        shouldAutoStart: !storage.seen && storage.enabled,
        tourEnabled: storage.enabled,
        next,
        skip,
        startTour,
        setTourEnabled,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextType {
  const ctx = useContext(TourContext);

  if (!ctx) throw new Error("useTour must be used within TourProvider");

  return ctx;
}
