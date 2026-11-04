import type { AppUser, AutomationRecord, NewAutomationInput, ServiceStatus } from "../types";
import { isSupabaseConfigured, supabase } from "./supabase";

const DEMO_AUTOMATIONS_KEY = "openclaw_demo_automations";
const DEMO_AUTH_KEY = "openclaw_demo_user";

const demoSeed: AutomationRecord[] = [
  {
    id: crypto.randomUUID(),
    name: "Lead Qualification Agent",
    vertical: "B2B SaaS",
    status: "active",
    monthlyValue: 4200,
    activeAgents: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Follow-up Nurture Pipeline",
    vertical: "E-commerce",
    status: "active",
    monthlyValue: 3100,
    activeAgents: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Campaign Reporting Copilot",
    vertical: "Marketing Agency",
    status: "paused",
    monthlyValue: 1850,
    activeAgents: 1,
    createdAt: new Date().toISOString(),
  },
];

function getDemoAutomations(): AutomationRecord[] {
  const raw = localStorage.getItem(DEMO_AUTOMATIONS_KEY);

  if (!raw) {
    localStorage.setItem(DEMO_AUTOMATIONS_KEY, JSON.stringify(demoSeed));
    return demoSeed;
  }

  try {
    return JSON.parse(raw) as AutomationRecord[];
  } catch {
    localStorage.setItem(DEMO_AUTOMATIONS_KEY, JSON.stringify(demoSeed));
    return demoSeed;
  }
}

function setDemoAutomations(data: AutomationRecord[]) {
  localStorage.setItem(DEMO_AUTOMATIONS_KEY, JSON.stringify(data));
}

function mapStatus(status: string): ServiceStatus {
  if (status === "active" || status === "paused") {
    return status;
  }

  return "draft";
}

async function getSupabaseUserId() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error(error?.message ?? "Authentication required.");
  }

  return data.user.id;
}

export const backend = {
  usingDemoMode: !isSupabaseConfigured,

  async getUser(): Promise<AppUser | null> {
    if (!isSupabaseConfigured || !supabase) {
      const rawUser = localStorage.getItem(DEMO_AUTH_KEY);
      return rawUser ? (JSON.parse(rawUser) as AppUser) : null;
    }

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? "",
      fullName: data.user.user_metadata.full_name as string | undefined,
    };
  },

  async signIn(email: string, password: string): Promise<AppUser> {
    if (!isSupabaseConfigured || !supabase) {
      const demoUser: AppUser = {
        id: crypto.randomUUID(),
        email,
        fullName: "Demo Operator",
      };

      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoUser));
      return demoUser;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "Failed to sign in.");
    }

    return {
      id: data.user.id,
      email: data.user.email ?? "",
      fullName: data.user.user_metadata.full_name as string | undefined,
    };
  },

  async signUp(email: string, password: string, fullName: string): Promise<AppUser> {
    if (!isSupabaseConfigured || !supabase) {
      const demoUser: AppUser = {
        id: crypto.randomUUID(),
        email,
        fullName,
      };

      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoUser));
      return demoUser;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "Failed to create account.");
    }

    return {
      id: data.user.id,
      email: data.user.email ?? "",
      fullName,
    };
  },

  async signOut() {
    if (!isSupabaseConfigured || !supabase) {
      localStorage.removeItem(DEMO_AUTH_KEY);
      return;
    }

    await supabase.auth.signOut();
  },

  async listAutomations(): Promise<AutomationRecord[]> {
    if (!isSupabaseConfigured || !supabase) {
      return getDemoAutomations().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const userId = await getSupabaseUserId();

    const { data, error } = await supabase
      .from("automations")
      .select("id, name, vertical, status, monthly_value, active_agents, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.name as string) ?? "Untitled Automation",
      vertical: (row.vertical as string) ?? "General",
      status: mapStatus((row.status as string) ?? "draft"),
      monthlyValue: Number(row.monthly_value ?? 0),
      activeAgents: Number(row.active_agents ?? 0),
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
    }));
  },

  async createAutomation(input: NewAutomationInput): Promise<AutomationRecord> {
    if (!isSupabaseConfigured || !supabase) {
      const created: AutomationRecord = {
        id: crypto.randomUUID(),
        name: input.name,
        vertical: input.vertical,
        status: "draft",
        monthlyValue: input.monthlyValue,
        activeAgents: input.activeAgents,
        createdAt: new Date().toISOString(),
      };

      const next = [created, ...getDemoAutomations()];
      setDemoAutomations(next);
      return created;
    }

    const userId = await getSupabaseUserId();

    const { data, error } = await supabase
      .from("automations")
      .insert({
        user_id: userId,
        name: input.name,
        vertical: input.vertical,
        status: "draft",
        monthly_value: input.monthlyValue,
        active_agents: input.activeAgents,
      })
      .select("id, name, vertical, status, monthly_value, active_agents, created_at")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create automation");
    }

    return {
      id: data.id as string,
      name: (data.name as string) ?? "Untitled Automation",
      vertical: (data.vertical as string) ?? "General",
      status: mapStatus((data.status as string) ?? "draft"),
      monthlyValue: Number(data.monthly_value ?? 0),
      activeAgents: Number(data.active_agents ?? 0),
      createdAt: (data.created_at as string) ?? new Date().toISOString(),
    };
  },
};