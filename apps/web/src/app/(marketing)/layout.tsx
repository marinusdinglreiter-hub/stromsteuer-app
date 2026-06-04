import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center">
          <span className="font-semibold">Stromsteuer-Erstattung</span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-sm text-muted-foreground">
        <div className="container">
          © {new Date().getFullYear()} Stromsteuer-Erstattung
        </div>
      </footer>
    </div>
  );
}
