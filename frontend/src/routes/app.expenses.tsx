import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/expenses")({
  component: ExpensesPage,
});

const CATEGORIES = [
  "general",
  "materials",
  "travel",
  "software",
  "equipment",
  "office",
  "marketing",
  "utilities",
  "other",
] as const;

type Expense = {
  id: string;
  project_id: string | null;
  category: string;
  description: string;
  amount: number;
  vendor: string | null;
  expense_date: string;
  method: string | null;
  reference: string | null;
  projects?: { name: string } | null;
};

function ExpensesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    project_id: "none",
    category: "general",
    description: "",
    amount: "",
    vendor: "",
    expense_date: new Date().toISOString().slice(0, 10),
    method: "",
    reference: "",
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const data = await api.get<{ results: Expense[] }>("/expenses/");
      return data.results;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects-lookup"],
    enabled: isAdmin,
    queryFn: async () => {
      return await api.get<any[]>("/projects/min/");
    },
  });

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const monthTotal = (expenses ?? [])
    .filter((e) => e.expense_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, e) => s + Number(e.amount), 0);

  const reset = () => {
    setForm({
      project_id: "none",
      category: "general",
      description: "",
      amount: "",
      vendor: "",
      expense_date: new Date().toISOString().slice(0, 10),
      method: "",
      reference: "",
    });
    setEditing(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        project_id: form.project_id === "none" ? null : form.project_id,
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount) || 0,
        vendor: form.vendor.trim() || null,
        expense_date: form.expense_date,
        method: form.method.trim() || null,
        reference: form.reference.trim() || null,
      };
      if (!payload.description) throw new Error("Description is required");
      if (editing) {
        await api.patch(`/expenses/${editing.id}/`, payload);
      } else {
        await api.post("/expenses/", payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Expense updated" : "Expense logged");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard-activity"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}/`);
    },
    onSuccess: () => {
      toast.success("Expense removed");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard-activity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      project_id: e.project_id ?? "none",
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      vendor: e.vendor ?? "",
      expense_date: e.expense_date,
      method: e.method ?? "",
      reference: e.reference ?? "",
    });
    setOpen(true);
  };

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Expenses" />
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Admin access required.
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track project costs and overhead."
        actions={
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) reset();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Log expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit expense" : "Log expense"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Amount (৳) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={form.expense_date}
                      onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Project</Label>
                    <Select
                      value={form.project_id}
                      onValueChange={(v) => setForm({ ...form, project_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Vendor</Label>
                    <Input
                      value={form.vendor}
                      onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Method</Label>
                    <Input
                      placeholder="cash, bkash, card…"
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Reference / receipt #</Label>
                  <Input
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total expenses
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">{formatMoney(total)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{expenses?.length ?? 0} entries</p>
        </Card>
        <Card className="border-border bg-card p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            This month
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">{formatMoney(monthTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !expenses || expenses.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No expenses yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 px-5 py-4 transition-colors hover:bg-secondary/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{e.description}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                      {e.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(e.expense_date)}
                    {e.projects?.name && <> · {e.projects.name}</>}
                    {e.vendor && <> · {e.vendor}</>}
                    {e.method && <> · {e.method}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold">{formatMoney(e.amount)}</span>
                  <Button size="icon" variant="ghost" onClick={() => startEdit(e)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(e.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
