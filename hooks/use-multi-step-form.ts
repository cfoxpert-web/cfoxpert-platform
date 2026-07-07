import { useState } from "react";

export function useMultiStepForm(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);

  return {
    currentStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    next: () => setCurrentStep((s) => Math.min(s + 1, totalSteps - 1)),
    back: () => setCurrentStep((s) => Math.max(s - 1, 0)),
    goTo: (step: number) => setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1))),
  };
}
