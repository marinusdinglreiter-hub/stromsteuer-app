"use client";

import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function MandatAccordion({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900"
      >
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          {title}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-normal text-slate-500">
          {open ? (
            <>
              Schließen <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Dokument lesen <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </span>
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
          {children}
        </div>
      ) : null}
    </div>
  );
}
