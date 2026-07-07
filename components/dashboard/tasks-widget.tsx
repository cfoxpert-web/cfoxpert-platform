"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import type { TaskItem } from "@/types";

interface TasksWidgetProps {
  items: TaskItem[];
}

export function TasksWidget({ items: initialItems }: TasksWidgetProps) {
  const [items, setItems] = useState(initialItems);

  function toggle(id: string) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-[16px] text-navy">Tasks</h3>
      <div className="flex flex-col gap-3">
        {items.map((task) => (
          <button
            key={task.id}
            onClick={() => toggle(task.id)}
            className="flex w-full items-center gap-3 text-left"
          >
            <span
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-line transition-colors",
                task.done && "border-teal bg-teal"
              )}
            >
              {task.done && <Check className="h-3 w-3 text-white" />}
            </span>
            <div>
              <div className={cn("text-[13.5px] text-ink", task.done && "text-slate-light line-through")}>
                {task.title}
              </div>
              <div className="text-[11px] text-slate-light">{task.dueLabel}</div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
