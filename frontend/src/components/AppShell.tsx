import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Users,
  UserCog,
  LayoutDashboard,
  LogOut,
  Wallet,
  Receipt,
  CheckSquare,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const adminNav = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/projects", label: "Projects", icon: Briefcase },
    { to: "/app/todos", label: "Todos", icon: CheckSquare },
    { to: "/app/expenses", label: "Expenses", icon: Receipt },
    { to: "/app/employees", label: "Employees", icon: UserCog },
    { to: "/app/clients", label: "Clients", icon: Users },
    { to: "/app/users", label: "User Accounts", icon: Shield },
    { to: "/app/me/profile", label: "My Profile", icon: User },
  ] as const;

  const empNav = [
    { to: "/app/me", label: "My Work", icon: Briefcase },
    { to: "/app/me/payments", label: "My Payments", icon: Wallet },
    { to: "/app/todos", label: "My Todos", icon: CheckSquare },
    { to: "/app/me/profile", label: "My Profile", icon: User },
  ] as const;

  const nav = isAdmin ? adminNav : empNav;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-brand text-primary-foreground font-display font-bold">
            P
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Praxis ERP</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== "/app" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 px-1">
            <p className="truncate text-xs text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <p className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
              {isAdmin ? "Admin" : "Employee"}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-brand text-primary-foreground font-display font-bold">
            P
          </div>
          <span className="font-display font-semibold">Praxis ERP</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <nav className="sticky top-14 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 lg:hidden">
        {nav.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to !== "/app" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
