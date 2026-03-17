import { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import { ShieldCheck } from "lucide-react";
import { animate } from "animejs";

const CONSENT_KEY = "vv-consent-v1";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible || !cardRef.current) return;
    animate(cardRef.current, {
      translateY: { from: "24px", to: "0px" },
      opacity: { from: 0, to: 1 },
      duration: 500,
      easing: "easeOutCubic",
    });
  }, [visible]);

  const accept = () => {
    if (cardRef.current) {
      animate(cardRef.current, {
        translateY: { from: "0px", to: "24px" },
        opacity: { from: 1, to: 0 },
        duration: 300,
        easing: "easeInCubic",
        onComplete: () => {
          localStorage.setItem(CONSENT_KEY, "accepted");
          setVisible(false);
        },
      });
    } else {
      localStorage.setItem(CONSENT_KEY, "accepted");
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xl px-4">
      <div ref={cardRef} className="glass rounded-2xl p-4 shadow-large" style={{ opacity: 0 }}>
        <div className="flex gap-3 items-start">
          <ShieldCheck className="text-primary shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">Datenschutz & Datenverarbeitung</p>
            <p className="text-xs text-default-500 leading-relaxed">
              VeloVeni speichert deinen Namen, Profilbild und GPS-Streckendaten von Strava, um das
              Spiel zu betreiben. Daten werden auf EU-Servern gespeichert. Du kannst deinen Account
              und alle Daten jederzeit in den Einstellungen löschen (DSGVO Art. 17). Mit
              „Akzeptieren" stimmst du der Verarbeitung zu.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3 justify-end">
          <Button color="primary" size="sm" onPress={accept}>
            Akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
}
