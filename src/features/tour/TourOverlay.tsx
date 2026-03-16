import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useTour } from "./tour-context";
import { TOUR_STEPS } from "./tour-steps";
import TourTooltip from "./TourTooltip";

const TOOLTIP_W = 300;
const NAVBAR_H = 64;
const GAP = 10;

export default function TourOverlay() {
  const { isActive, currentStep, next } = useTour();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    const tooltipH = tooltipRef.current?.offsetHeight ?? 160;

    // Mobile-skip: advance if target has zero dimensions
    if (step.target && step.mobileSkip) {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      const rect = el?.getBoundingClientRect();

      if (!rect || rect.width === 0 || rect.height === 0) {
        next();
        return;
      }
    }

    // Welcome step — centred on screen
    if (!step.target) {
      setStyle({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      return;
    }

    // Navbar step — directly below the navbar, horizontally centred
    if (step.target === "nav-bar") {
      setStyle({ top: NAVBAR_H + GAP, left: "50%", transform: "translateX(-50%)" });
      return;
    }

    // Sidebar steps — to the left of the target element, vertically centred on it
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const top = Math.max(
      NAVBAR_H + GAP,
      Math.min(
        rect.top + rect.height / 2 - tooltipH / 2,
        window.innerHeight - tooltipH - GAP,
      ),
    );
    const left = Math.max(GAP, rect.left - TOOLTIP_W - GAP);

    setStyle({ top, left });
  }, [isActive, currentStep, next]);

  if (!isActive) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" style={{ zIndex: 9990 }} />

      {/* Tooltip — anchored to its target element */}
      <div
        ref={tooltipRef}
        className="fixed"
        style={{ zIndex: 9998, width: TOOLTIP_W, ...style }}
      >
        <TourTooltip stepIndex={currentStep} />
      </div>
    </>,
    document.body,
  );
}
