import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { backend } from "./lib/backend";
import type { AppUser, AutomationRecord, NewAutomationInput, ServiceStatus } from "./types";

type NavItem = { to: string; label: string };

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/agents", label: "Agents" },
  { to: "/clients", label: "Clients" },
  { to: "/settings", label: "Settings" },
];

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [automations, setAutomations] = useState<AutomationRecord[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const refreshAutomations = async () => {
    try {
      setLoadingAutomations(true);
      const rows = await backend.listAutomations();
      setAutomations(rows);
      setDbError(null);
    } catch (error) {
      setDbError(error instanceof Error ? error.message : "Failed to load data.");
    } finally {
      setLoadingAutomations(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const appUser = await backend.getUser();
      setUser(appUser);
      setLoadingUser(false);
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!user) {
      setAutomations([]);
      return;
    }

    refreshAutomations();
  }, [user]);

  const handleCreate = async (input: NewAutomationInput) => {
    const created = await backend.createAutomation(input);
    setAutomations((current) => [created, ...current]);
  };

  const handleLogout = async () => {
    await backend.signOut();
    setUser(null);
  };

  if (loadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg">
          Loading OpenClaw Control...
        </motion.p>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage
              onAuthenticated={(appUser) => setUser(appUser)}
              usingDemoMode={backend.usingDemoMode}
            />
          )
        }
      />
      <Route
        path="/*"
        element={
          user ? (
            <DashboardLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <OverviewPage
                      automations={automations}
                      loading={loadingAutomations}
                      error={dbError}
                      onCreate={handleCreate}
                    />
                  }
                />
                <Route
                  path="/agents"
                  element={<AgentsPage automations={automations} loading={loadingAutomations} />}
                />
                <Route path="/clients" element={<ClientsPage automations={automations} />} />
                <Route
                  path="/settings"
                  element={<SettingsPage user={user} usingDemoMode={backend.usingDemoMode} />}
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function LoginPage({
  onAuthenticated,
  usingDemoMode,
}: {
  onAuthenticated: (user: AppUser) => void;
  usingDemoMode: boolean;
}) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("Founder");
  const [email, setEmail] = useState("ceo@smarttechit.com");
  const [password, setPassword] = useState("OpenClaw#2026");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const appUser = isSignup
        ? await backend.signUp(email, password, name)
        : await backend.signIn(email, password);
      onAuthenticated(appUser);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to continue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.38),_transparent_52%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.25),_transparent_48%)]" />
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16"
      >
        <div className="grid w-full gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-7 self-center">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Smart Tech IT and Marketing Solution</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              OpenClaw Agent Dashboard
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Command AI automation services, monitor delivery value, and coordinate every digital marketing workflow from one operating system.
            </p>
            {usingDemoMode ? (
              <p className="text-sm text-sky-200">
                Demo mode is active. Add Supabase keys to connect production auth and database.
              </p>
            ) : null}
          </section>

          <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-2xl font-medium">{isSignup ? "Create Control Account" : "Operator Sign In"}</h2>
            {isSignup ? (
              <label className="block space-y-1">
                <span className="text-sm text-slate-300">Full name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-sky-400"
                  required
                />
              </label>
            ) : null}
            <label className="block space-y-1">
              <span className="text-sm text-slate-300">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-sky-400"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-slate-300">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-sky-400"
                required
              />
            </label>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-70"
            >
              {submitting ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => setIsSignup((current) => !current)}
              className="text-sm text-sky-300 transition hover:text-sky-200"
            >
              {isSignup ? "Already have access? Sign in" : "Need an account? Create one"}
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}

function DashboardLayout({
  user,
  onLogout,
  children,
}: {
  user: AppUser;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[230px_1fr]">
        <aside className="border-b border-slate-800 p-5 lg:border-r lg:border-b-0">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Smart Tech IT and Marketing Solution</p>
          <h2 className="mt-2 text-xl font-semibold">OpenClaw Control</h2>
          <p className="mt-2 text-sm text-slate-400">{user.email}</p>
          <nav className="mt-8 flex gap-4 lg:flex-col">
            {navItems.map((item) => {
              const active = location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm transition ${active ? "text-sky-300" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={async () => {
              await onLogout();
              navigate("/login");
            }}
            className="mt-10 text-sm text-rose-300 transition hover:text-rose-200"
          >
            Sign out
          </button>
        </aside>

        <main className="p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function OverviewPage({
  automations,
  loading,
  error,
  onCreate,
}: {
  automations: AutomationRecord[];
  loading: boolean;
  error: string | null;
  onCreate: (payload: NewAutomationInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("Marketing Agency");
  const [monthlyValue, setMonthlyValue] = useState("2500");
  const [activeAgents, setActiveAgents] = useState("2");
  const [saving, setSaving] = useState(false);

  const totalValue = automations.reduce((sum, item) => sum + item.monthlyValue, 0);
  const activePrograms = automations.filter((row) => row.status === "active").length;
  const totalAgents = automations.reduce((sum, item) => sum + item.activeAgents, 0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onCreate({
        name,
        vertical,
        monthlyValue: Number(monthlyValue),
        activeAgents: Number(activeAgents),
      });

      setName("");
      setVertical("Marketing Agency");
      setMonthlyValue("2500");
      setActiveAgents("2");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-9">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Operations Dashboard</h1>
        <p className="text-slate-400">Track delivery volume and launch new automations in less than a minute.</p>
      </header>

      <div className="grid gap-8 border-y border-slate-800 py-5 sm:grid-cols-3">
        <Metric label="Monthly Managed Value" value={`$${totalValue.toLocaleString()}`} />
        <Metric label="Live Automations" value={String(activePrograms)} />
        <Metric label="Active AI Agents" value={String(totalAgents)} />
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-medium">Launch new automation</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Automation name"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-sky-400"
            required
          />
          <input
            value={vertical}
            onChange={(event) => setVertical(event.target.value)}
            placeholder="Client vertical"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-sky-400"
            required
          />
          <input
            value={monthlyValue}
            onChange={(event) => setMonthlyValue(event.target.value)}
            type="number"
            min="0"
            placeholder="Monthly value"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-sky-400"
            required
          />
          <input
            value={activeAgents}
            onChange={(event) => setActiveAgents(event.target.value)}
            type="number"
            min="1"
            placeholder="Active agents"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-sky-400"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-70"
        >
          {saving ? "Creating..." : "Create automation"}
        </button>
      </form>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {loading ? <p className="text-slate-400">Loading automations...</p> : null}

      <section>
        <h2 className="mb-3 text-lg font-medium">Automation Pipeline</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="px-2 py-3 font-medium">Name</th>
                <th className="px-2 py-3 font-medium">Vertical</th>
                <th className="px-2 py-3 font-medium">Status</th>
                <th className="px-2 py-3 font-medium">Monthly Value</th>
                <th className="px-2 py-3 font-medium">Agents</th>
              </tr>
            </thead>
            <tbody>
              {automations.map((item) => (
                <tr key={item.id} className="border-b border-slate-900 text-slate-200">
                  <td className="px-2 py-3">{item.name}</td>
                  <td className="px-2 py-3">{item.vertical}</td>
                  <td className="px-2 py-3">
                    <StatusLabel status={item.status} />
                  </td>
                  <td className="px-2 py-3">${item.monthlyValue.toLocaleString()}</td>
                  <td className="px-2 py-3">{item.activeAgents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function StatusLabel({ status }: { status: ServiceStatus }) {
  const className =
    status === "active"
      ? "text-emerald-300"
      : status === "paused"
        ? "text-amber-300"
        : "text-slate-400";

  return <span className={className}>{status}</span>;
}

function AgentsPage({ automations, loading }: { automations: AutomationRecord[]; loading: boolean }) {
  const agentRows = useMemo(
    () => [
      {
        id: "lead-engine",
        name: "Lead Engine Agent",
        role: "Scoring and routing inbound leads",
        linkedAutomations: automations.filter((item) => item.status === "active").length,
      },
      {
        id: "campaign-pilot",
        name: "Campaign Pilot Agent",
        role: "Builds and optimizes ad campaign routines",
        linkedAutomations: Math.max(1, Math.floor(automations.length / 2)),
      },
      {
        id: "retention-monitor",
        name: "Retention Monitor Agent",
        role: "Detects churn signals and triggers recovery flows",
        linkedAutomations: Math.max(1, Math.floor(automations.length / 3)),
      },
    ],
    [automations]
  );

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Agent Fleet</h1>
        <p className="mt-2 text-slate-400">Assign reusable AI operators to each client automation program.</p>
      </header>
      {loading ? <p className="text-slate-400">Loading agent coverage...</p> : null}
      <div className="divide-y divide-slate-800 border-y border-slate-800">
        {agentRows.map((agent) => (
          <div key={agent.id} className="grid gap-2 py-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
            <p className="font-medium text-slate-100">{agent.name}</p>
            <p className="text-slate-400">{agent.role}</p>
            <p className="text-sm text-sky-300">{agent.linkedAutomations} automations attached</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClientsPage({ automations }: { automations: AutomationRecord[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();

    for (const automation of automations) {
      const row = map.get(automation.vertical) ?? { count: 0, revenue: 0 };
      row.count += 1;
      row.revenue += automation.monthlyValue;
      map.set(automation.vertical, row);
    }

    return [...map.entries()];
  }, [automations]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Client Verticals</h1>
        <p className="mt-2 text-slate-400">Business coverage and revenue impact by market segment.</p>
      </header>
      <div className="divide-y divide-slate-800 border-y border-slate-800">
        {grouped.map(([vertical, row]) => (
          <div key={vertical} className="grid gap-2 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
            <p className="text-slate-100">{vertical}</p>
            <p className="text-slate-400">{row.count} automations</p>
            <p className="text-sky-300">${row.revenue.toLocaleString()} / month</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsPage({ user, usingDemoMode }: { user: AppUser; usingDemoMode: boolean }) {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-slate-400">Configuration for authentication, database, and operator profile.</p>
      </header>
      <div className="space-y-2 border-y border-slate-800 py-4 text-sm">
        <p>
          <span className="text-slate-400">Signed in as:</span> {user.email}
        </p>
        <p>
          <span className="text-slate-400">Backend mode:</span> {usingDemoMode ? "Demo (local storage)" : "Supabase Production"}
        </p>
        <p className="text-slate-400">
          For production, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment and run the SQL migration in
          <code className="ml-1 rounded bg-slate-900 px-1 py-0.5 text-slate-200">supabase/schema.sql</code>.
        </p>
      </div>
    </section>
  );
}
