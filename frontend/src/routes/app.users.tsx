import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, User, Edit } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/users")({
  component: UsersManagementPage,
});

type UserAccount = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  is_superuser: boolean;
  is_active: boolean;
  roles: string[];
  date_joined: string;
};

function UsersManagementPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [form, setForm] = useState({
    display_name: "",
    is_superuser: false,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-management"],
    queryFn: async () => {
      const data = await api.get<{ results: UserAccount[] }>("/users/");
      return data.results;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await api.patch(`/users/${editing.id}/`, {
        display_name: form.display_name.trim(),
        is_superuser: form.is_superuser,
      });
    },
    onSuccess: () => {
      toast.success("Account updated");
      void qc.invalidateQueries({ queryKey: ["users-management"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (u: UserAccount) => {
    setEditing(u);
    setForm({
      display_name: u.display_name || "",
      is_superuser: u.is_superuser,
    });
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="User Accounts"
        description="Manage system access and roles."
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="grid gap-4">
        {users?.map((u) => (
          <Card key={u.id} className="border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">{u.display_name || u.username}</h3>
                    {u.is_superuser && (
                      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                        <ShieldAlert className="mr-1 h-3 w-3" /> Superuser
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right mr-4 hidden sm:block">
                   <p className="text-xs font-medium">Roles</p>
                   <div className="flex gap-1 mt-1">
                     {u.roles.map(r => (
                       <Badge key={r} variant="outline" className="capitalize text-[10px] py-0">{r}</Badge>
                     ))}
                   </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label>Superuser Status</Label>
                <p className="text-xs text-muted-foreground">
                  Grants full administrative access to everything.
                </p>
              </div>
              <Switch
                checked={form.is_superuser}
                onCheckedChange={(v) => setForm({ ...form, is_superuser: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
