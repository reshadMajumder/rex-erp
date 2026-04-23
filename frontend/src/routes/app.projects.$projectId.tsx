import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Wallet,
  UserPlus,
  StickyNote,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatMoney, formatDate } from "@/lib/format";
import { StatusBadge } from "./app.projects.index";

export const Route = createFileRoute("/app/projects/$projectId")({
  component: ProjectDetail,
});

const STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      return await api.get<any>(`/projects/${projectId}/`);
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["assignments", projectId],
    queryFn: async () => {
      return await api.get<any[]>(`/projects/${projectId}/assignments/`);
    },
  });

  const { data: clientPayments } = useQuery({
    queryKey: ["client_payments", projectId],
    queryFn: async () => {
      return await api.get<any[]>(`/projects/${projectId}/client_payments/`);
    },
  });

  const { data: empPayments } = useQuery({
    queryKey: ["employee_payments", projectId],
    enabled: !!assignments,
    queryFn: async () => {
      return await api.get<any[]>(`/projects/${projectId}/employee_payments/`);
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["notes", projectId],
    queryFn: async () => {
      return await api.get<any[]>(`/projects/${projectId}/notes/`);
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-min"],
    queryFn: async () => {
      return await api.get<any[]>("/employees/min/");
    },
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      await api.delete(`/projects/${projectId}/`);
    },
    onSuccess: () => {
      toast.success("Project deleted");
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate({ to: "/app/projects" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!project) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Button asChild variant="link">
          <Link to="/app/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  const totalReceived = (clientPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const totalAssigned = (assignments ?? []).reduce((s, a) => s + Number(a.task_amount), 0);
  const totalPaidOut = (empPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const budget = Number(project.budget);
  const receivedPct = budget > 0 ? Math.min(100, (totalReceived / budget) * 100) : 0;
  const paidPct = totalAssigned > 0 ? Math.min(100, (totalPaidOut / totalAssigned) * 100) : 0;

  return (
    <>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/app/projects">
            <ArrowLeft className="mr-1 h-4 w-4" /> All projects
          </Link>
        </Button>
      </div>
      <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {project.clients?.name && <span>Client: {project.clients.name}</span>}
            {project.start_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(project.start_date)} → {formatDate(project.end_date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="mr-1 h-4 w-4" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the project and all its assignments, client
                  payments, employee payments, and notes. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteProject.mutate()}
                >
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Budget" value={formatMoney(budget)} />
        <StatCard
          label="Received"
          value={formatMoney(totalReceived)}
          sub={`${receivedPct.toFixed(0)}% of budget`}
          progress={receivedPct}
        />
        <StatCard
          label="Assigned to team"
          value={formatMoney(totalAssigned)}
          sub={`${assignments?.length ?? 0} ${assignments?.length === 1 ? "person" : "people"}`}
        />
        <StatCard
          label="Paid out"
          value={formatMoney(totalPaidOut)}
          sub={`${paidPct.toFixed(0)}% of assigned`}
          progress={paidPct}
        />
      </div>

      <Tabs defaultValue="team" className="mt-8">
        <TabsList className="grid w-full grid-cols-4 sm:inline-flex sm:w-auto">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="client">Client $</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <TeamTab
            projectId={projectId}
            assignments={assignments ?? []}
            employees={employees ?? []}
          />
        </TabsContent>
        <TabsContent value="client" className="mt-4">
          <ClientPaymentsTab projectId={projectId} payments={clientPayments ?? []} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <PayrollTab
            projectId={projectId}
            assignments={assignments ?? []}
            payments={empPayments ?? []}
          />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesTab projectId={projectId} notes={notes ?? []} />
        </TabsContent>
      </Tabs>

      <EditProjectDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
      />
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
}) {
  return (
    <Card className="border-border bg-card p-4 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 font-display text-xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      {progress !== undefined && <Progress value={progress} className="mt-2 h-1.5" />}
    </Card>
  );
}

/* ---------------- Edit project ---------------- */

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  budget: number | string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  client_id: string | null;
};

function EditProjectDialog({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: ProjectRow;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    budget: String(project.budget),
    start_date: project.start_date ?? "",
    end_date: project.end_date ?? "",
    status: project.status as (typeof STATUSES)[number],
    client_id: project.client_id ?? "",
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      return await api.get<any[]>("/clients/min/");
    },
  });

  const update = useMutation({
    mutationFn: async () => {
      await api.patch(`/projects/${project.id}/`, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        budget: form.budget ? parseFloat(form.budget) : 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        client_id: form.client_id || null,
      });
    },
    onSuccess: () => {
      toast.success("Project updated");
      void qc.invalidateQueries({ queryKey: ["project", project.id] });
      void qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update project details safely.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return toast.error("Name is required");
            update.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Budget (৳)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as (typeof STATUSES)[number] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select
              value={form.client_id || "none"}
              onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Team tab ---------------- */

type Assignment = {
  id: string;
  employee_id: string;
  task_description: string | null;
  task_amount: number | string;
  employees: { id: string; name: string; email: string | null } | null;
};

type Employee = { id: string; name: string };

function TeamTab({
  projectId,
  assignments,
  employees,
}: {
  projectId: string;
  assignments: Assignment[];
  employees: Employee[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const assignedIds = new Set(assignments.map((a) => a.employee_id));
  const availableEmployees = employees.filter((e) => !assignedIds.has(e.id));

  const create = useMutation({
    mutationFn: async () => {
      await api.post(`/projects/${projectId}/assignments/`, {
        employee_id: employeeId,
        task_amount: amount ? parseFloat(amount) : 0,
        task_description: desc.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Employee assigned");
      void qc.invalidateQueries({ queryKey: ["assignments", projectId] });
      setOpen(false);
      setEmployeeId("");
      setAmount("");
      setDesc("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${projectId}/assignments/${id}/`);
    },
    onSuccess: () => {
      toast.success("Assignment removed");
      void qc.invalidateQueries({ queryKey: ["assignments", projectId] });
      void qc.invalidateQueries({ queryKey: ["employee_payments", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="font-display text-base font-semibold">Assigned employees</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={availableEmployees.length === 0}>
              <UserPlus className="mr-1 h-4 w-4" /> Assign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign employee</DialogTitle>
              <DialogDescription>Set their agreed task amount for this project.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!employeeId) return toast.error("Pick an employee");
                create.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Employee *</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Task amount (৳)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Task description</Label>
                <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  Assign
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {assignments.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          No employees assigned yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium">{a.employees?.name}</p>
                {a.task_description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{a.task_description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-semibold">
                  {formatMoney(a.task_amount)}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove assignment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will also remove every payment recorded against this assignment.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => remove.mutate(a.id)}
                      >
                        Remove
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
  );
}

/* ---------------- Client payments ---------------- */

type ClientPayment = {
  id: string;
  amount: number | string;
  payment_date: string;
  method: string | null;
  reference: string | null;
};

function ClientPaymentsTab({
  projectId,
  payments,
}: {
  projectId: string;
  payments: ClientPayment[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    method: "",
    reference: "",
  });

  const add = useMutation({
    mutationFn: async () => {
      await api.post(`/projects/${projectId}/client_payments/`, {
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        method: form.method.trim() || null,
        reference: form.reference.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      void qc.invalidateQueries({ queryKey: ["client_payments", projectId] });
      void qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setForm({
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        method: "",
        reference: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${projectId}/client_payments/${id}/`);
    },
    onSuccess: () => {
      toast.success("Payment removed");
      void qc.invalidateQueries({ queryKey: ["client_payments", projectId] });
      void qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="font-display text-base font-semibold">Client payments received</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Record payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record client payment</DialogTitle>
              <DialogDescription>Add a chunk received from the client.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.amount) return toast.error("Amount is required");
                add.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (৳) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Input
                  placeholder="bKash, bank, cash..."
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reference / note</Label>
                <Input
                  placeholder="Txn ID, advance, milestone 1..."
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={add.isPending}>
                  Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {payments.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          No payments recorded.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="font-display text-base font-semibold">{formatMoney(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.payment_date)}
                  {p.method ? ` · ${p.method}` : ""}
                  {p.reference ? ` · ${p.reference}` : ""}
                </p>
              </div>
              <DeleteIconConfirm onConfirm={() => remove.mutate(p.id)} label="Delete this payment record?" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- Payroll ---------------- */

type EmpPayment = {
  id: string;
  assignment_id: string;
  amount: number | string;
  payment_date: string;
  method: string | null;
  reference: string | null;
  project_assignments: {
    employee_id: string;
    employees: { name: string } | null;
  } | null;
};

function PayrollTab({
  projectId,
  assignments,
  payments,
}: {
  projectId: string;
  assignments: Assignment[];
  payments: EmpPayment[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    assignment_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    method: "",
    reference: "",
  });

  const add = useMutation({
    mutationFn: async () => {
      await api.post(`/projects/${projectId}/employee_payments/`, {
        assignment_id: form.assignment_id,
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        method: form.method.trim() || null,
        reference: form.reference.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      void qc.invalidateQueries({ queryKey: ["employee_payments", projectId] });
      void qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setForm({
        assignment_id: "",
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        method: "",
        reference: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${projectId}/employee_payments/${id}/`);
    },
    onSuccess: () => {
      toast.success("Payment removed");
      void qc.invalidateQueries({ queryKey: ["employee_payments", projectId] });
      void qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Per-employee summary
  const summary = assignments.map((a) => {
    const paid = payments
      .filter((p) => p.assignment_id === a.id)
      .reduce((s, p) => s + Number(p.amount), 0);
    return {
      assignment: a,
      paid,
      remaining: Number(a.task_amount) - paid,
    };
  });

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-base font-semibold">Per-employee balances</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={assignments.length === 0}>
                <Wallet className="mr-1 h-4 w-4" /> Pay employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pay employee</DialogTitle>
                <DialogDescription>
                  Record an advance or milestone payment to an assigned employee.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.assignment_id) return toast.error("Pick an employee");
                  if (!form.amount) return toast.error("Amount is required");
                  add.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label>Employee *</Label>
                  <Select
                    value={form.assignment_id}
                    onValueChange={(v) => setForm({ ...form, assignment_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.employees?.name} — agreed {formatMoney(a.task_amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Amount (৳) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.payment_date}
                      onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <Input
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference / note</Label>
                  <Input
                    placeholder="Advance, milestone, final..."
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={add.isPending}>
                    Record payment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {summary.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Assign employees first to track payroll.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {summary.map((s) => (
              <li key={s.assignment.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{s.assignment.employees?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Agreed {formatMoney(s.assignment.task_amount)}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-success">Paid: {formatMoney(s.paid)}</span>
                  <span className={s.remaining > 0 ? "text-warning-foreground" : "text-muted-foreground"}>
                    Remaining: {formatMoney(s.remaining)}
                  </span>
                </div>
                <Progress
                  value={
                    Number(s.assignment.task_amount) > 0
                      ? Math.min(100, (s.paid / Number(s.assignment.task_amount)) * 100)
                      : 0
                  }
                  className="mt-2 h-1.5"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-base font-semibold">Payment history</h3>
        </div>
        {payments.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No employee payments yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="font-medium">
                    {p.project_assignments?.employees?.name ?? "—"}{" "}
                    <span className="font-display font-semibold text-primary">
                      {formatMoney(p.amount)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.payment_date)}
                    {p.method ? ` · ${p.method}` : ""}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <DeleteIconConfirm onConfirm={() => remove.mutate(p.id)} label="Delete this payment record?" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Notes ---------------- */

type Note = {
  id: string;
  content: string;
  entity_type: string;
  created_at: string;
};

function NotesTab({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      await api.post(`/projects/${projectId}/notes/`, {
        entity_type: "project",
        content: content.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Note added");
      void qc.invalidateQueries({ queryKey: ["notes", projectId] });
      setContent("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${projectId}/notes/${id}/`);
    },
    onSuccess: () => {
      toast.success("Note deleted");
      void qc.invalidateQueries({ queryKey: ["notes", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card p-5 shadow-soft">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!content.trim()) return;
            add.mutate();
          }}
          className="space-y-3"
        >
          <Label>Add a note to this project's timeline</Label>
          <Textarea
            placeholder="What happened today? A decision, a chat with the client, anything."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={add.isPending || !content.trim()}>
              <StickyNote className="mr-1 h-4 w-4" /> Save note
            </Button>
          </div>
        </form>
      </Card>

      {notes.length === 0 ? (
        <Card className="border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
          No notes yet. Document everything — your future self will thank you.
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id} className="border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                <DeleteIconConfirm onConfirm={() => remove.mutate(n.id)} label="Delete this note?" />
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                {formatDate(n.created_at)} · {new Date(n.created_at).toLocaleTimeString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Shared confirm icon ---------------- */

function DeleteIconConfirm({
  onConfirm,
  label,
}: {
  onConfirm: () => void;
  label: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
