"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

export function Toaster(
  props: React.ComponentProps<typeof SonnerToaster>,
): JSX.Element {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      {...props}
    />
  );
}

export { toast };
