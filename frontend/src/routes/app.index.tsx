import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Briefcase,
  Users,
  Wallet,
  TrendingUp,
  Receipt,
  CheckSquare,
  ArrowDownLeft,
  ArrowUpRight,
  StickyNote,
  Clock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

type Activity = {
  id: string;
  kind: "client_payment" | "employee_payment" | "expense" | "todo" | "project" | "note";
  title: string;
  subtitle: string;
  amount?: number;
  at: string;
  href?: { to: string; params?: Record<string, string> };
};

type DashboardStats = {
  projectCount: number;
  activeCount: number;
  employeeCount: number;
  totalBudget: number;
  received: number;
  paid: number;
  totalExpenses: number;
  openTodos: number;
};

type RecentProject = {
  id: string;
  name: string;
  status: string;
  budget: number;
  end_date: string | null;
  clients: { name: string } | null;
};

function Dashboard() {
  const { isAdmin, isEmployee, loading } = useAuth();

  if (!loading && !isAdmin && isEmployee) {
    return <Navigate to="/app/me" />;
  }

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      return await api.get<DashboardStats>("/dashboard/stats/");
    },
  });

  const { data: recentProjects } = useQuery({
    queryKey: ["dashboard-recent-projects"],
    enabled: isAdmin,
    queryFn: async () => {
      return await api.get<RecentProject[]>("/dashboard/recent_projects/");
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    enabled: isAdmin,
    queryFn: async () => {
      return await api.get<Activity[]>("/dashboard/activity/");
    },
  });

  if (!isAdmin) return null;

  const cards = [
    {
      label: "Projects",
      value: stats?.projectCount ?? 0,
      sub: `${stats?.activeCount ?? 0} active`,
      icon: Briefcase,
    },
    { label: "Employees", value: stats?.employeeCount ?? 0, sub: "On the team", icon: Users },
    {
      label: "Total budget",
      value: formatMoney(stats?.totalBudget ?? 0),
      sub: "Across all projects",
      icon: TrendingUp,
    },
    {
      label: "Net cash",
      value: formatMoney(
        (stats?.received ?? 0) - (stats?.paid ?? 0) - (stats?.totalExpenses ?? 0),
      ),
      sub: `${formatMoney(stats?.received ?? 0)} in · ${formatMoney((stats?.paid ?? 0) + (stats?.totalExpenses ?? 0))} out`,
      icon: Wallet,
    },
    {
      label: "Expenses",
      value: formatMoney(stats?.totalExpenses ?? 0),
      sub: "All-time",
      icon: Receipt,
    },
    {
      label: "Open todos",
      value: stats?.openTodos ?? 0,
      sub: "Awaiting action",
      icon: CheckSquare,
    },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="A snapshot of your operation." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.label}
              className="border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </p>
                  <p className="mt-2 truncate font-display text-2xl font-semibold">{c.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Recent activity</h2>
            <span className="text-xs text-muted-foreground">Last 12 events</span>
          </div>
          <Card className="border-border bg-card shadow-soft">
            {!activity || activity.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
                No activity yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activity.map((a) => (
                  <ActivityRow key={a.id} a={a} />
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Recent projects</h2>
            <Link to="/app/projects" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          <Card className="border-border bg-card shadow-soft">
            {(!recentProjects || recentProjects.length === 0) && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No projects yet.{" "}
                <Link to="/app/projects" className="text-primary hover:underline">
                  Create your first one →
                </Link>
              </div>
            )}
            {recentProjects && recentProjects.length > 0 && (
              <ul className="divide-y divide-border">
                {recentProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/app/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-secondary/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.clients?.name ?? "No client"} ·{" "}
                          <span className="capitalize">{p.status}</span>
                        </p>
                      </div>
                      <span className="font-display text-sm font-semibold">
                        {formatMoney(p.budget)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const meta = ICONS[a.kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const content = (
    <div className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/40">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
      >
        <Icon className={`h-4 w-4 ${meta.fg}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.title}</p>
        <p className="truncate text-xs text-muted-foreground">{a.subtitle}</p>
      </div>
      <div className="text-right">
        {typeof a.amount === "number" && (
          <p
            className={`font-display text-sm font-semibold ${a.kind === "client_payment" ? "text-emerald-600 dark:text-emerald-400" : a.kind === "employee_payment" || a.kind === "expense" ? "text-destructive" : ""}`}
          >
            {a.kind === "client_payment" ? "+" : "−"}
            {formatMoney(a.amount)}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">{formatDate(a.at)}</p>
      </div>
    </div>
  );
  if (a.href) {
    return (
      <li>
        <Link to={a.href.to} params={a.href.params as { projectId: string }}>
          {content}
        </Link>
      </li>
    );
  }
  return <li>{content}</li>;
}

const ICONS: Record<
  Activity["kind"],
  { icon: typeof ArrowDownLeft; bg: string; fg: string }
> = {
  client_payment: {
    icon: ArrowDownLeft,
    bg: "bg-emerald-500/10",
    fg: "text-emerald-600 dark:text-emerald-400",
  },
  employee_payment: {
    icon: ArrowUpRight,
    bg: "bg-destructive/10",
    fg: "text-destructive",
  },
  expense: { icon: Receipt, bg: "bg-amber-500/10", fg: "text-amber-600 dark:text-amber-400" },
  todo: { icon: CheckSquare, bg: "bg-primary/10", fg: "text-primary" },
  project: { icon: Briefcase, bg: "bg-secondary", fg: "text-secondary-foreground" },
  note: { icon: StickyNote, bg: "bg-secondary", fg: "text-secondary-foreground" },
};
