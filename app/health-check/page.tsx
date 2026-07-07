"use client";

import { useState } from "react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { ProgressBar } from "@/components/health-score/progress-bar";
import { QuestionCard } from "@/components/health-score/question-card";
import { AnalyzingScreen } from "@/components/health-score/analyzing-screen";
import { ResultsPanel } from "@/components/health-score/results-panel";
import { ContactCaptureForm } from "@/components/forms/contact-capture-form";
import { useMultiStepForm } from "@/hooks/use-multi-step-form";
import { HEALTH_CHECK_QUESTIONS } from "@/constants/health-check-questions";
import { computeHealthCheckResult, type AnswerMap } from "@/lib/health-check/score-engine";
import { sendToWebhook } from "@/lib/webhook";
import type { ContactDetailsInput } from "@/lib/validation";
import type { HealthCheckResult } from "@/types";

type Phase = "contact" | "questions" | "analyzing" | "results";

export default function HealthCheckPage() {
  const [phase, setPhase] = useState<Phase>("contact");
  const [contact, setContact] = useState<ContactDetailsInput | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<HealthCheckResult | null>(null);

  const totalQuestions = HEALTH_CHECK_QUESTIONS.length;
  const { currentStep, isFirstStep, isLastStep, next, back } = useMultiStepForm(totalQuestions);
  const currentQuestion = HEALTH_CHECK_QUESTIONS[currentStep]!;

  function handleContactSubmit(data: ContactDetailsInput) {
    setContact(data);
    void sendToWebhook({ type: "health_check_lead_captured", contact: data, submittedAt: new Date().toISOString() });
    setPhase("questions");
  }

  function handleAnswer(score: number) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: score }));
  }

  function handleNext() {
    if (isLastStep) {
      setPhase("analyzing");
    } else {
      next();
    }
  }

  function handleAnalysisComplete() {
    const computed = computeHealthCheckResult(answers);
    setResult(computed);
    void sendToWebhook({
      type: "health_check_completed",
      contact,
      answers,
      result: computed,
    });
    setPhase("results");
  }

  return (
    <Section spacing="compact" className="min-h-screen bg-mist pt-10">
      <Container size="narrow">
        {phase === "contact" && <ContactCaptureForm onSubmit={handleContactSubmit} />}

        {phase === "questions" && (
          <>
            <ProgressBar current={currentStep} total={totalQuestions} />
            <QuestionCard
              question={currentQuestion}
              value={answers[currentQuestion.key]}
              onAnswer={handleAnswer}
              onBack={back}
              onNext={handleNext}
              isFirst={isFirstStep}
              isLast={isLastStep}
            />
          </>
        )}

        {phase === "analyzing" && <AnalyzingScreen onComplete={handleAnalysisComplete} />}

        {phase === "results" && result && contact && (
          <ResultsPanel result={result} firstName={contact.name.split(" ")[0] ?? contact.name} />
        )}
      </Container>
    </Section>
  );
}
