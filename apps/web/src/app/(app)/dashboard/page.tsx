import { Button } from "@stromsteuer/ui/button";

export default function DashboardPage() {
  return (
    <section className="container py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Hello {"{email}"} — App-Stub, noch ohne Auth.
      </p>
      <div className="mt-6">
        <Button variant="secondary">Neuer Antrag</Button>
      </div>
    </section>
  );
}
