"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import type { HealthCheckQuestion } from "@/constants/health-check-questions";

interface QuestionCardProps {
  question: HealthCheckQuestion;
  value: number | undefined;
  /** Selected option index — selection identity. Scores may collide
      (two turnover bands both score 80), so never compare by score. */
  selectedIndex?: number;
  onAnswer: (score: number, optionIndex?: number) => void;
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function QuestionCard({
  question,
  value,
  selectedIndex,
  onAnswer,
  onBack,
  onNext,
  isFirst,
  isLast,
}: QuestionCardProps) {
  return (
    <motion.div
      key={question.key}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="flex min-h-[380px] flex-col p-9 sm:p-11">
        <p className="mb-3.5 text-eyebrow font-bold uppercase text-teal">{question.eyebrow}</p>
        <h2 className="mb-2 max-w-lg font-display text-[24px] font-medium text-navy sm:text-[27px]">
          {question.title}
        </h2>
        <p className="mb-8 text-[15px] text-slate">{question.sub}</p>

        {question.type === "options" && (
          <div className="flex flex-col gap-2.5">
            {question.options.map((option, i) => {
              const selected = selectedIndex === i;
              return (
                <button
                  key={i}
                  onClick={() => onAnswer(option.score, i)}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-sm border-[1.5px] border-line px-5 py-[18px] text-left text-[15px] font-medium text-ink transition-all duration-150 hover:border-slate-light hover:bg-mist",
                    selected && "border-teal bg-teal-light text-navy"
                  )}
                >
                  <span>{option.label}</span>
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line transition-colors",
                      selected && "border-teal bg-teal"
                    )}
                  >
                    {selected && <Check className="h-3 w-3 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {question.type === "slider" && (
          <div>
            <div className="mb-4 font-display text-[38px] font-semibold text-navy">
              {value ?? question.defaultValue}%
            </div>
            <input
              type="range"
              min={question.min}
              max={question.max}
              value={value ?? question.defaultValue}
              onChange={(e) => onAnswer(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <div className="mt-2 flex justify-between text-[12.5px] text-slate-light">
              <span>{question.lowLabel}</span>
              <span>{question.highLabel}</span>
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-8">
          <Button variant="ghost" onClick={onBack} className={cn(isFirst && "invisible")}>
            ← Back
          </Button>
          <Button onClick={onNext} disabled={value === undefined}>
            {isLast ? "See my results" : "Continue"} →
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
