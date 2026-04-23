import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Trash2, Edit, UserCog, Mail, Phone, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/employees")({
  component: EmployeesPage,
});

type Employee = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  user_id: string | null;
};

function EmployeesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [resetFor, setResetFor] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
  });

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const data = await api.get<{ results: Employee[] }>("/employees/");
      return data.results;
    },
  });

  const reset = () => {
    setForm({ name: "", email: "", phone: "", role: "", password: "" });
    setEditing(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.patch(`/employees/${editing.id}/`, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          role: form.role.trim() || null,
        });
      } else {
        await api.post("/employees/", {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || null,
          role: form.role.trim() || null,
        });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Employee updated" : "Employee account created");
      void qc.invalidateQueries({ queryKey: ["employees"] });
      void qc.invalidateQueries({ queryKey: ["employees-min"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (employee: Employee) => {
      await api.delete(`/employees/${employee.id}/`);
    },
    onSuccess: () => {
      toast.success("Employee removed");
      void qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newPw, setNewPw] = useState("");
  const resetPw = useMutation({
    mutationFn: async () => {
      if (!resetFor) return;
      await api.post(`/employees/${resetFor.id}/reset_password/`, {
        password: newPw,
      });
    },
    onSuccess: () => {
      toast.success("Password updated");
      setResetFor(null);
      setNewPw("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    reset();
    setOpen(true);
  };
  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      name: emp.name,
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      role: emp.role ?? "",
      password: "",
    });
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Employees"
        description="Create login accounts for your team. They'll only see their assignments and payments."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> New employee
          </Button>
        }
      />

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update profile details. Use 'Reset password' to change their login."
                : "An account is created with the email + password below. They can sign in immediately."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) return toast.error("Name is required");
              if (!editing) {
                if (!form.email.trim()) return toast.error("Email is required");
                if (form.password.length < 6)
                  return toast.error("Password must be at least 6 characters");
              }
              save.mutate();
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email {editing ? "" : "*"}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required={!editing}
                  disabled={!!editing && !!editing.user_id}
                />
                {editing?.user_id && (
                  <p className="text-[10px] text-muted-foreground">
                    Login email can't be changed here.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role / title</Label>
              <Input
                placeholder="Designer, Developer..."
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>Password * (min 6 chars)</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <p className="text-[10px] text-muted-foreground">
                  Share this with the employee so they can log in.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending
                  ? "Saving..."
                  : editing
                    ? "Save"
                    : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog
        open={!!resetFor}
        onOpenChange={(v) => {
          if (!v) {
            setResetFor(null);
            setNewPw("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {resetFor?.name}</DialogTitle>
            <DialogDescription>
              Set a new password for their login. Share it securely.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newPw.length < 6) return toast.error("Min 6 characters");
              resetPw.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setResetFor(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetPw.isPending}>
                {resetPw.isPending ? "Updating..." : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isLoading && employees && employees.length === 0 && (
        <Card className="border-dashed border-border bg-card p-12 text-center shadow-soft">
          <UserCog className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-lg font-semibold">No employees yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the people you work with — they'll get a login of their own.
          </p>
        </Card>
      )}

      {employees && employees.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((e) => (
            <Card key={e.id} className="border-border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold leading-tight">{e.name}</h3>
                  {e.role && <p className="mt-0.5 text-xs text-muted-foreground">{e.role}</p>}
                </div>
                <div className="flex gap-1">
                  {e.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Reset password"
                      onClick={() => setResetFor(e)}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(e)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {e.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {e.user_id
                            ? "This deletes their login, every assignment they had, and all payment records linked to those assignments. This cannot be undone."
                            : "This removes them from every project they're assigned to and deletes their payment history."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => remove.mutate(e)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {e.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> {e.email}
                  </p>
                )}
                {e.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {e.phone}
                  </p>
                )}
                {e.user_id ? (
                  <p className="mt-1 inline-block rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                    Has login
                  </p>
                ) : (
                  <p className="mt-1 inline-block rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
                    Record only · no login
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
