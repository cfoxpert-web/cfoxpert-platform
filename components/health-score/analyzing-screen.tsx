"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";

const STEPS = [
  "Reviewing your responses",
  "Benchmarking against comparable businesses",
  "Calculating your Enterprise Value Score",
  "Preparing your roadmap",
];

interface AnalyzingScreenProps {
  onComplete: () => void;
}

export function AnalyzingScreen({ onComplete }: AnalyzingScreenProps) {
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      setActiveStep(step);
      step += 1;
      if (step >= STEPS.length) {
        clearInterval(interval);
        setTimeout(onComplete, 600);
      }
    }, 550);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-14 text-center">
      <div className="mx-auto mb-7 h-[88px] w-[88px] animate-spin rounded-full border-4 border-line border-t-teal" />
      <h3 className="mb-2.5 font-display text-xl text-navy">Calculating your Business Health Score</h3>
      <p className="mb-7 text-sm text-slate">This takes just a few seconds.</p>
      <div className="mx-auto flex max-w-xs flex-col gap-2.5 text-left">
        {STEPS.map((step, i) => {
          const active = i <= activeStep;
          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2.5 text-[13.5px] transition-opacity duration-300",
                active ? "font-semibold text-navy opacity-100" : "text-slate-light opacity-40"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line",
                  active && "border-teal bg-teal"
                )}
              >
                {active && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              {step}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
