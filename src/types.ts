export type ServiceStatus = "active" | "paused" | "draft";

export type AutomationRecord = {
  id: string;
  name: string;
  vertical: string;
  status: ServiceStatus;
  monthlyValue: number;
  activeAgents: number;
  createdAt: string;
};

export type NewAutomationInput = {
  name: string;
  vertical: string;
  monthlyValue: number;
  activeAgents: number;
};

export type AppUser = {
  id: string;
  email: string;
  fullName?: string;
};