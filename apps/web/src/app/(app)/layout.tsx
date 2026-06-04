import type { ReactNode } from "react";

// TODO Sprint 0 Teil 2: Auth-Guard mit Auth.js — Redirect auf /login wenn nicht eingeloggt.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-muted/30">
        <div className="container flex h-14 items-center">
          <span className="font-semibold">App</span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
