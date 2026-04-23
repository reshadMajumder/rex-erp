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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Trash2, Edit, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/todos")({
  component: TodosPage,
});

type TodoStatus = "open" | "in_progress" | "done" | "cancelled";
type TodoPriority = "low" | "medium" | "high" | "urgent";

type Todo = {
  id: string;
  project_id: string | null;
  assignee_id: string | null;
  title: string;
  details: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  due_date: string | null;
  completed_at: string | null;
  projects?: { name: string } | null;
  employees?: { name: string } | null;
};

const PRIORITY_STYLE: Record<TodoPriority, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  urgent: "bg-destructive/15 text-destructive",
};

function TodosPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | TodoStatus>("all");
  const [editing, setEditing] = useState<Todo | null>(null);
  const [form, setForm] = useState({
    title: "",
    details: "",
    status: "open" as TodoStatus,
    priority: "medium" as TodoPriority,
    project_id: "none",
    assignee_id: "none",
    due_date: "",
  });

  const { data: todos, isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const data = await api.get<{ results: Todo[] }>("/todos/");
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

  const { data: employees } = useQuery({
    queryKey: ["employees-lookup"],
    enabled: isAdmin,
    queryFn: async () => {
      return await api.get<any[]>("/employees/min/");
    },
  });

  const filtered = (todos ?? []).filter((t) => filter === "all" || t.status === filter);
  const counts = {
    open: (todos ?? []).filter((t) => t.status === "open").length,
    in_progress: (todos ?? []).filter((t) => t.status === "in_progress").length,
    done: (todos ?? []).filter((t) => t.status === "done").length,
  };

  const reset = () => {
    setForm({
      title: "",
      details: "",
      status: "open",
      priority: "medium",
      project_id: "none",
      assignee_id: "none",
      due_date: "",
    });
    setEditing(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      const payload = {
        title: form.title.trim(),
        details: form.details.trim() || null,
        status: form.status,
        priority: form.priority,
        project_id: form.project_id === "none" ? null : form.project_id,
        assignee_id: form.assignee_id === "none" ? null : form.assignee_id,
        due_date: form.due_date || null,
        completed_at: form.status === "done" ? new Date().toISOString() : null,
      };
      if (editing) {
        await api.patch(`/todos/${editing.id}/`, payload);
      } else {
        await api.post("/todos/", payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Todo updated" : "Todo added");
      qc.invalidateQueries({ queryKey: ["todos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-activity"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDone = useMutation({
    mutationFn: async (t: Todo) => {
      const isDone = t.status === "done";
      await api.patch(`/todos/${t.id}/`, {
        status: isDone ? "open" : "done",
        completed_at: isDone ? null : new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-activity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/todos/${id}/`);
    },
    onSuccess: () => {
      toast.success("Todo removed");
      qc.invalidateQueries({ queryKey: ["todos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-activity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (t: Todo) => {
    setEditing(t);
    setForm({
      title: t.title,
      details: t.details ?? "",
      status: t.status,
      priority: t.priority,
      project_id: t.project_id ?? "none",
      assignee_id: t.assignee_id ?? "none",
      due_date: t.due_date ?? "",
    });
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title={isAdmin ? "Todos" : "My todos"}
        description={isAdmin ? "Plan and assign work across projects." : "Tasks assigned to you."}
        actions={
          isAdmin && (
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) reset();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1 h-4 w-4" /> New todo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit todo" : "New todo"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Details</Label>
                    <Textarea
                      rows={3}
                      value={form.details}
                      onChange={(e) => setForm({ ...form, details: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={form.status}
                        onValueChange={(v) => setForm({ ...form, status: v as TodoStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Priority</Label>
                      <Select
                        value={form.priority}
                        onValueChange={(v) => setForm({ ...form, priority: v as TodoPriority })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                          <SelectItem value="none">None</SelectItem>
                          {projects?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Assignee</Label>
                      <Select
                        value={form.assignee_id}
                        onValueChange={(v) => setForm({ ...form, assignee_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {employees?.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
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
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "open", "in_progress", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
            )}
          >
            {f.replace("_", " ")}
            {f !== "all" && (
              <span className="ml-1.5 opacity-70">({counts[f as keyof typeof counts]})</span>
            )}
          </button>
        ))}
      </div>

      <Card className="border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <CheckSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No todos here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => {
              const done = t.status === "done";
              const overdue =
                !done && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString());
              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-secondary/40"
                >
                  <Checkbox
                    checked={done}
                    onCheckedChange={() => toggleDone.mutate(t)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "font-medium",
                          done && "text-muted-foreground line-through",
                        )}
                      >
                        {t.title}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          PRIORITY_STYLE[t.priority],
                        )}
                      >
                        {t.priority}
                      </span>
                      {t.status !== "open" && t.status !== "done" && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                          {t.status.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {t.details && (
                      <p className="mt-1 text-xs text-muted-foreground">{t.details}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.projects?.name && <>{t.projects.name} · </>}
                      {t.employees?.name && <>{t.employees.name} · </>}
                      {t.due_date ? (
                        <span className={cn(overdue && "font-medium text-destructive")}>
                          Due {formatDate(t.due_date)}
                        </span>
                      ) : (
                        <span>No due date</span>
                      )}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(t)}>
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
                            <AlertDialogTitle>Delete todo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(t.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
