import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, CheckCircle2, CircleDashed, LockKeyhole, Orbit, Users, Workflow } from "lucide-react";
import type { PlatformSnapshot } from "../lib/platform-api";

const tierRank = { free: 0, backer: 1, pillar: 2, operator: 3 } as const;
const tierLabel = { free: "FREE", backer: "BACKER", pillar: "PILLAR", operator: "OPERATOR" } as const;

export default function PlatformCommandCenter() {
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [tier, setTier] = useState<keyof typeof tierRank>("pillar");
  const [activeView, setActiveView] = useState<"overview" | "library" | "kanban" | "reports">("overview");

  useEffect(() => {
    fetch("/api/platform/snapshot", { headers: { "x-artifact-user": "preview-user", "x-artifact-tier": tier } })
      .then((response) => response.ok ? response.json() : null)
      .then(setSnapshot)
      .catch(() => setSnapshot(null));
  }, [tier]);

  const stats = useMemo(() => [
    { label: "INDEXED DOCUMENTS", value: snapshot?.documents.length ?? 0, icon: BookOpen },
    { label: "ACTIVE WORKSTREAMS", value: snapshot?.kanban.length ?? 0, icon: Workflow },
    { label: "REPORTS READY", value: snapshot?.reports.length ?? 0, icon: Orbit },
    { label: "ACCESS TIER", value: tierLabel[tier], icon: Users },
  ], [snapshot, tier]);

  const nav = [
    ["overview", "Command center"], ["library", "Research library"], ["kanban", "Operating kanban"], ["reports", "Investor reporting"],
  ] as const;

  return <main className="min-h-screen bg-[#050607] text-white font-sans selection:bg-cyan-300 selection:text-black">
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col border-x border-white/10 bg-[#07090a]">
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 px-6 py-5 md:px-10">
        <div className="flex items-center gap-4"><div className="grid size-10 place-items-center border border-cyan-300/50 text-cyan-200"><Orbit size={18} /></div><div><p className="font-mono text-[9px] tracking-[0.35em] text-cyan-200/70">ARTIFACT / EXCHANGE</p><h1 className="text-xl font-semibold tracking-tight">Platform command center</h1></div></div>
        <div className="flex items-center gap-2"><span className="font-mono text-[9px] tracking-[0.25em] text-white/35">VIEW AS</span>{(Object.keys(tierRank) as Array<keyof typeof tierRank>).map((option) => <button key={option} onClick={() => setTier(option)} className={`border px-3 py-2 font-mono text-[9px] tracking-[0.15em] transition-colors ${tier === option ? "border-cyan-200 bg-cyan-200 text-black" : "border-white/15 text-white/50 hover:border-white/40"}`}>{tierLabel[option]}</button>)}</div>
      </header>
      <div className="grid flex-1 md:grid-cols-[220px_1fr]">
        <aside className="border-b border-white/10 p-4 md:border-b-0 md:border-r md:p-5"><div className="flex gap-2 overflow-x-auto md:flex-col">{nav.map(([key, label]) => <button key={key} onClick={() => setActiveView(key)} className={`flex shrink-0 items-center justify-between gap-3 border px-3 py-3 text-left text-xs transition-colors ${activeView === key ? "border-cyan-200/50 bg-cyan-200/10 text-cyan-100" : "border-transparent text-white/45 hover:border-white/10 hover:text-white"}`}>{label}<ArrowUpRight size={13} /></button>)}</div><div className="mt-8 hidden border-t border-white/10 pt-5 md:block"><p className="font-mono text-[9px] leading-5 text-white/30">ONE ACCESS MODEL<br />ACROSS LIBRARY, LEDGER<br />AND INVESTOR RELATIONS.</p></div></aside>
        <section className="p-5 md:p-10">
          <div className="mb-8 flex items-end justify-between gap-5"><div><p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-cyan-200/60">{activeView.toUpperCase()} // LIVE SURFACE</p><h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-5xl">One coherent operating layer for the Artifact network.</h2></div><div className="hidden text-right md:block"><p className="font-mono text-[9px] text-white/30">MEMBERSHIP STATUS</p><p className="mt-1 text-sm text-cyan-100">{snapshot?.membership.status ?? "Preview mode"}</p></div></div>
          <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="bg-[#0a0c0d] p-5"><Icon className="mb-8 text-cyan-200/70" size={17} /><p className="font-mono text-[9px] tracking-[0.2em] text-white/35">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}</div>
          <div className="mt-8 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">{activeView === "library" || activeView === "overview" ? <Surface title="Research library" icon={<BookOpen size={15} />}><div className="flex flex-col gap-3">{snapshot?.documents.slice(0, 5).map((doc) => <div key={doc.id} className="flex items-center justify-between border-b border-white/10 pb-3"><div><p className="text-sm text-white/85">{doc.title}</p><p className="mt-1 font-mono text-[9px] text-white/35">{doc.source} · {doc.accessTier.toUpperCase()}</p></div>{tierRank[tier] >= tierRank[doc.accessTier as keyof typeof tierRank] ? <CheckCircle2 size={15} className="text-cyan-200" /> : <LockKeyhole size={15} className="text-white/30" />}</div>) ?? <EmptyState label="Documents will appear after source sync." />}</div></Surface> : null}{activeView === "kanban" || activeView === "overview" ? <Surface title="Operating kanban" icon={<Workflow size={15} />}><div className="grid gap-3 sm:grid-cols-2">{snapshot?.kanban.slice(0, 6).map((card) => <div key={card.id} className="border border-white/10 bg-white/[0.02] p-3"><div className="flex items-center justify-between"><span className="font-mono text-[9px] text-cyan-200/70">{card.columnKey}</span><CircleDashed size={13} className="text-white/25" /></div><p className="mt-4 text-sm text-white/80">{card.title}</p><p className="mt-2 font-mono text-[9px] text-white/30">{card.priority.toUpperCase()} · {card.board}</p></div>) ?? <EmptyState label="No operating cards are visible at this tier." />}</div></Surface> : null}{activeView === "reports" || activeView === "overview" ? <Surface title="Investor reporting" icon={<Orbit size={15} />}><div className="flex flex-col gap-3">{snapshot?.reports.slice(0, 4).map((report) => <div key={report.id} className="flex items-center justify-between border-b border-white/10 pb-3"><div><p className="text-sm text-white/85">{report.title}</p><p className="mt-1 font-mono text-[9px] text-white/35">{report.reportType} · {report.period || "Current"}</p></div><button className="font-mono text-[9px] tracking-[0.1em] text-cyan-200 hover:text-white">OPEN</button></div>) ?? <EmptyState label="Reports will populate once the investor feed is connected." />}</div></Surface> : null}</div>
        </section>
      </div>
    </div>
  </main>;
}

function Surface({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <article className="border border-white/10 bg-[#0a0c0d] p-5 md:p-6"><div className="mb-6 flex items-center gap-2 border-b border-white/10 pb-4 text-sm text-white/75">{icon}<h3>{title}</h3></div>{children}</article>; }
function EmptyState({ label }: { label: string }) { return <p className="py-6 font-mono text-[10px] leading-5 text-white/30">{label}</p>; }
