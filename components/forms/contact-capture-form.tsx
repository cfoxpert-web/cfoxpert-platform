"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactDetailsSchema, type ContactDetailsInput } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/cards/card";

interface ContactCaptureFormProps {
  onSubmit: (data: ContactDetailsInput) => void;
  submitLabel?: string;
}

export function ContactCaptureForm({
  onSubmit,
  submitLabel = "Start Health Check →",
}: ContactCaptureFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactDetailsInput>({ resolver: zodResolver(contactDetailsSchema) });

  return (
    <Card className="p-9 sm:p-11">
      <p className="mb-3.5 text-eyebrow font-bold uppercase text-teal">Before we start</p>
      <h2 className="mb-2 font-display text-2xl font-medium text-navy">
        Where should we send your results?
      </h2>
      <p className="mb-8 text-sm text-slate">
        Takes 15 seconds. We&apos;ll use this only to share your Business Health Score and roadmap.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="cc-name" className="mb-2 block text-[13px] font-semibold text-navy">
            Full name
          </label>
          <Input
            id="cc-name"
            placeholder="e.g. Rajesh Kumar"
            error={!!errors.name}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "cc-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="cc-name-error" role="alert" className="mt-1.5 text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cc-phone" className="mb-2 block text-[13px] font-semibold text-navy">
            Mobile number
          </label>
          <Input
            id="cc-phone"
            placeholder="e.g. 98765 43210"
            error={!!errors.phone}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "cc-phone-error" : undefined}
            {...register("phone")}
          />
          {errors.phone && (
            <p id="cc-phone-error" role="alert" className="mt-1.5 text-xs text-destructive">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cc-email" className="mb-2 block text-[13px] font-semibold text-navy">
            Email address
          </label>
          <Input
            id="cc-email"
            type="email"
            placeholder="e.g. you@company.com"
            error={!!errors.email}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "cc-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="cc-email-error" role="alert" className="mt-1.5 text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <p className="text-xs text-slate-light">We respect your privacy — no spam, ever.</p>

        <Button type="submit" size="lg" className="mt-2 w-full">
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}
