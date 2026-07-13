"use client";

import { useRef, useTransition } from "react";

import { updateCalcAction } from "@/app/antrag/actions";
import { antragsfaehigeJahre } from "@/config/antrag";

type Props = {
  current: number;
  branche: string;
  geschaetzteKwh: number;
};

export function AntragsjahrPicker({ current, branche, geschaetzteKwh }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const jahre = antragsfaehigeJahre();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    startTransition(() => {
      void updateCalcAction(null, formData);
    });
  }

  return (
    <form ref={formRef} className="inline-flex items-center gap-2 text-sm">
      <label htmlFor="antragsjahr" className="text-slate-600">
        Verbrauchsjahr:
      </label>
      <input type="hidden" name="branche" value={branche} />
      <input type="hidden" name="geschaetzteKwh" value={geschaetzteKwh} />
      <select
        id="antragsjahr"
        name="antragsjahr"
        defaultValue={current}
        onChange={handleChange}
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
      >
        {jahre.map((jahr) => (
          <option key={jahr} value={jahr}>
            {jahr}
          </option>
        ))}
      </select>
      {pending ? (
        <span className="text-xs text-slate-400">speichert…</span>
      ) : null}
    </form>
  );
}
