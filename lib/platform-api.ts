export type MembershipTier = "free" | "backer" | "pillar" | "operator";

export type PlatformSnapshot = {
  membership: { tier: MembershipTier; status: string };
  documents: Array<{ id: string; title: string; source: string; sourceUrl?: string | null; accessTier: MembershipTier; summary?: string | null; metadata?: Record<string, unknown> }>;
  kanban: Array<{ id: string; board: string; title: string; columnKey: string; priority: string; accessTier: MembershipTier; owner?: string | null }>;
  reports: Array<{ id: string; reportType: string; title: string; period?: string | null; accessTier: MembershipTier; payload: Record<string, unknown> }>;
};

export async function getPlatformSnapshot(): Promise<PlatformSnapshot | null> {
  const response = await fetch("/api/platform/snapshot", { headers: { "x-artifact-user": "preview-user" } });
  if (!response.ok) return null;
  return response.json();
}
