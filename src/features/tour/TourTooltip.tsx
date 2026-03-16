import { Button, Card, CardBody } from "@heroui/react";

import { TOUR_STEPS } from "./tour-steps";
import { useTour } from "./tour-context";

interface Props {
  stepIndex: number;
}

export default function TourTooltip({ stepIndex }: Props) {
  const { next, skip } = useTour();
  const step = TOUR_STEPS[stepIndex];
  const total = TOUR_STEPS.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const primaryLabel = isFirst ? "Los geht's" : isLast ? "Fertig!" : "Weiter";

  return (
    <Card className="w-full shadow-2xl border border-divider" style={{ pointerEvents: "all" }}>
      <CardBody className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-sm leading-tight">{step.title}</p>
          <span className="text-[10px] text-default-400 shrink-0 mt-0.5 tabular-nums">
            {stepIndex + 1} / {total}
          </span>
        </div>
        <p className="text-xs text-default-500 leading-relaxed">{step.content}</p>
        <div className="flex gap-2 justify-end">
          {!isLast && (
            <Button size="sm" variant="light" onPress={skip}>
              Überspringen
            </Button>
          )}
          <Button color="primary" size="sm" onPress={next}>
            {primaryLabel}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
