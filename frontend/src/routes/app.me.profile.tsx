import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Calendar } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/me/profile")({
  component: MyProfilePage,
});

type ProfileData = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  created_at: string;
};

function MyProfilePage() {
  const { refreshRoles } = useAuth();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      return await api.get<ProfileData>("/profile/");
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [profile]);

  const update = useMutation({
    mutationFn: async () => {
      await api.patch("/profile/", {
        display_name: displayName.trim(),
      });
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      await refreshRoles();
      void qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Update your personal information."
      />

      <div className="max-w-2xl">
        <Card className="border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border">
             <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
               <User className="h-8 w-8 text-muted-foreground" />
             </div>
             <div>
               <h3 className="font-display text-xl font-semibold">{profile?.display_name || profile?.username}</h3>
               <p className="text-sm text-muted-foreground">{profile?.email}</p>
             </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate();
            }}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
               <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {profile?.email}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Email cannot be changed.</p>
               </div>
               <div className="space-y-1.5">
                  <Label>Joined Date</Label>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {profile?.created_at ? formatDate(profile.created_at) : "N/A"}
                  </div>
               </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How your name appears in the system"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
