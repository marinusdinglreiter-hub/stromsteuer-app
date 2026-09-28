"use client";

import { Plus } from "lucide-react";
import { useTransition } from "react";

import { createEmptyLieferstelleAction } from "@/app/antrag/schritt-2/actions";

import {
  LieferstelleCard,
  type LieferstelleData,
} from "./LieferstelleCard";

type Props = {
  initial: LieferstelleData[];
};

export function LieferstellenList({ initial }: Props) {
  const [pending, startTransition] = useTransition();

  function addLieferstelle() {
    startTransition(() => {
      void createEmptyLieferstelleAction();
    });
  }

  return (
    <div className="space-y-3">
      {initial.map((l, idx) => (
        <LieferstelleCard key={l.id} index={idx} lieferstelle={l} />
      ))}
      <button
        type="button"
        onClick={addLieferstelle}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-input px-4 py-2 text-sm font-medium text-foreground hover:border-input hover:bg-white disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Weitere Lieferstelle hinzufügen
      </button>
    </div>
  );
}
