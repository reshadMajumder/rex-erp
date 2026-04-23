import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/projects/")({
  component: ProjectsList,
});

const STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;

function ProjectsList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    client_id: "",
    budget: "",
    start_date: "",
    end_date: "",
    status: "planning" as (typeof STATUSES)[number],
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const data = await api.get<{ results: any[] }>("/projects/");
      return data.results;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const data = await api.get<any[]>("/clients/min/");
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/projects/", {
        name: form.name.trim(),
        description: form.description.trim() || null,
        client_id: form.client_id || null,
        budget: form.budget ? parseFloat(form.budget) : 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
      });
    },
    onSuccess: () => {
      toast.success("Project created");
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setForm({
        name: "",
        description: "",
        client_id: "",
        budget: "",
        start_date: "",
        end_date: "",
        status: "planning",
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every project, its budget, and where it stands."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.name.trim()) return toast.error("Name is required");
                  create.mutate();
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
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? "Creating..." : "Create project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isLoading && projects && projects.length === 0 && (
        <Card className="border-dashed border-border bg-card p-12 text-center shadow-soft">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-lg font-semibold">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Click "New project" to add your first one.
          </p>
        </Card>
      )}

      {projects && projects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to="/app/projects/$projectId"
              params={{ projectId: p.id }}
              className="group block rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-display text-lg font-semibold leading-tight tracking-tight group-hover:text-primary">
                  {p.name}
                </h3>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.clients?.name ?? "No client"}
              </p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Budget
                  </p>
                  <p className="font-display text-xl font-semibold">{formatMoney(p.budget)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.end_date ? `Due ${formatDate(p.end_date)}` : "No end date"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    planning: "bg-secondary text-secondary-foreground",
    active: "bg-success/15 text-success border border-success/30",
    on_hold: "bg-warning/15 text-warning-foreground border border-warning/40",
    completed: "bg-primary/10 text-primary border border-primary/20",
    cancelled: "bg-destructive/10 text-destructive border border-destructive/20",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status] ?? "bg-secondary"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
