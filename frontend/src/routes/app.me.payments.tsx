import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/format";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/app/me/payments")({
  component: MyPaymentsPage,
});

type PaymentData = {
  id: string;
  assignment_id: string;
  amount: number;
  payment_date: string;
  method: string | null;
  reference: string | null;
  project_name: string;
  created_at: string;
};

function MyPaymentsPage() {
  const { user } = useAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["my-payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      return await api.get<PaymentData[]>("/me/payments/");
    },
  });

  const total = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageHeader
        title="My payments"
        description="Every payment you've received, across all projects."
      />

      <Card className="mb-4 border-border bg-card p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Total received
        </p>
        <p className="mt-1 font-display text-3xl font-semibold">{formatMoney(total)}</p>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isLoading && (!payments || payments.length === 0) && (
        <Card className="border-dashed border-border bg-card p-12 text-center shadow-soft">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-lg font-semibold">No payments yet</h3>
        </Card>
      )}

      {payments && payments.length > 0 && (
        <Card className="border-border bg-card shadow-soft">
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-display text-base font-semibold">{formatMoney(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.project_name} ·{" "}
                    {formatDate(p.payment_date)}
                    {p.method ? ` · ${p.method}` : ""}
                  </p>
                  {p.reference && (
                    <p className="mt-1 text-xs text-muted-foreground">{p.reference}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
