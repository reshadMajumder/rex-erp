import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Wallet, NotebookPen, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading, isAdmin } = useAuth();

  if (!loading && user) {
    return <Navigate to={isAdmin ? "/app" : "/app/me"} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-brand font-display font-bold text-primary-foreground">
            P
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Praxis ERP</span>
        </div>
        <Button asChild variant="default">
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
          <Shield className="h-3 w-3" /> Personal project management
        </span>
        <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Run every project like
          <br />
          <span className="bg-gradient-brand bg-clip-text text-transparent">a small empire.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Track budgets, assign employees, log every chunk of client and payroll payment, and keep
          notes for every move — all in one quiet workspace.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">Open dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Create account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Briefcase, title: "Projects", desc: "Budget, timeline, status — all in view." },
          { icon: Users, title: "Team", desc: "Assign tasks and agreed amounts." },
          { icon: Wallet, title: "Payments", desc: "Chunked client and employee payments." },
          { icon: NotebookPen, title: "Notes", desc: "Document every operation." },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-card"
            >
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
