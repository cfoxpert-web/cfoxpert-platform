"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Card } from "@/components/cards/card";
import { uploadClientDocument } from "@/lib/documents/actions";
import {
  ACCEPT_ATTRIBUTE,
  DOCUMENT_KINDS,
  MAX_UPLOAD_BYTES,
} from "@/lib/documents/model";

/**
 * Amendment A4-a — client upload form. Posts to the flag-gated server
 * action; client uploads land at 'received' and wait for an analyst
 * (the form says so — no false promise of instant numbers).
 */
export function DocumentUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const submit = (formData: FormData) => {
    setError(null);
    setUploaded(false);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is larger than the 20 MB limit.");
      return;
    }

    startTransition(async () => {
      const result = await uploadClientDocument(formData);
      if (result.ok) {
        setUploaded(true);
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Card className="p-6">
      <h3 className="mb-1 font-display text-[16px] text-navy">
        Upload financials
      </h3>
      <p className="mb-4 text-[12.5px] text-slate-light">
        Trial Balance, P&amp;L, or Balance Sheet — PDF, Excel, or CSV, up to
        20&nbsp;MB. Your CFOxpert analyst reviews every upload before any
        numbers reach your report.
      </p>

      <form ref={formRef} action={submit} className="flex flex-col gap-3">
        <input
          type="file"
          name="file"
          accept={ACCEPT_ATTRIBUTE}
          required
          className="block w-full text-[13px] text-slate file:mr-3 file:rounded-input file:border-0 file:bg-mist file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-navy hover:file:bg-mist-2"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
            Document type
            <select
              name="kind"
              defaultValue="other"
              className="rounded-input border border-line bg-paper px-3 py-2 text-[13px] font-normal text-ink"
            >
              {DOCUMENT_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
            Period (optional)
            <input
              type="text"
              name="periodHint"
              placeholder="e.g. FY26 or Jun 2026"
              maxLength={100}
              className="rounded-input border border-line bg-paper px-3 py-2 text-[13px] font-normal text-ink placeholder:text-slate-light"
            />
          </label>
        </div>

        {error && <p className="text-[12.5px] text-red-600">{error}</p>}
        {uploaded && (
          <p className="text-[12.5px] text-teal">
            Uploaded — your analyst has been queued to review it.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-fit items-center gap-2 rounded-pill bg-navy px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <UploadCloud className="h-4 w-4" />
          {pending ? "Uploading…" : "Upload document"}
        </button>
      </form>
    </Card>
  );
}
