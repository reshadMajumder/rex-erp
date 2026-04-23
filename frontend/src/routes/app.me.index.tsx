import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMoney, formatDate } from "@/lib/format";
import { Briefcase } from "lucide-react";
import { StatusBadge } from "./app.projects.index";

export const Route = createFileRoute("/app/me/")({
  component: MyWorkPage,
});

type AssignmentData = {
  id: string;
  project_id: string;
  task_description: string | null;
  task_amount: number;
  paid: number;
  remaining: number;
  projects: {
    id: string;
    name: string;
    status: string;
    end_date: string | null;
  };
};

function MyWorkPage() {
  const { user } = useAuth();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["my-assignments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      return await api.get<AssignmentData[]>("/me/assignments/");
    },
  });

  return (
    <>
      <PageHeader
        title="My work"
        description="Projects assigned to you and what you've earned."
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isLoading && (!assignments || assignments.length === 0) && (
        <Card className="border-dashed border-border bg-card p-12 text-center shadow-soft">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-lg font-semibold">No assignments yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            When an admin assigns you to a project, it'll show here.
          </p>
        </Card>
      )}

      {assignments && assignments.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {assignments.map((a) => {
            const paid = a.paid;
            const agreed = a.task_amount;
            const remaining = a.remaining;
            const pct = agreed > 0 ? Math.min(100, (paid / agreed) * 100) : 0;
            return (
               <Card key={a.id} className="border-border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold leading-tight">
                      {a.projects?.name}
                    </h3>
                    {a.projects?.end_date && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Due {formatDate(a.projects.end_date)}
                      </p>
                    )}
                  </div>
                  {a.projects?.status && <StatusBadge status={a.projects.status} />}
                </div>
                {a.task_description && (
                  <p className="mt-3 text-sm text-muted-foreground">{a.task_description}</p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Agreed
                    </p>
                    <p className="font-display text-base font-semibold">{formatMoney(agreed)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Paid
                    </p>
                    <p className="font-display text-base font-semibold text-success">
                      {formatMoney(paid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Remaining
                    </p>
                    <p className="font-display text-base font-semibold">{formatMoney(remaining)}</p>
                  </div>
                </div>
                <Progress value={pct} className="mt-3 h-1.5" />
                <Link
                  to="/app/me/payments"
                  className="mt-3 inline-block text-xs text-primary hover:underline"
                >
                  View payment history →
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
