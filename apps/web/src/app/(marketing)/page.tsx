import { Button } from "@stromsteuer/ui/button";

export default function HomePage() {
  return (
    <section className="container py-20">
      <h1 className="text-4xl font-bold tracking-tight">
        Stromsteuer-Erstattung — Skeleton
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Marketing-Stub. Software-Tool zur Antragsvorbereitung nach § 9b
        StromStG. Keine Steuerberatung.
      </p>
      <div className="mt-8">
        <Button>Antrag starten</Button>
      </div>
    </section>
  );
}
