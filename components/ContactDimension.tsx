import React, { useState, useRef, useEffect } from 'react';

const ContactDimension: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    purpose: 'audit',
    scope: '',
    budget: '',
    risk: '',
    timeline: '10',
    signoff: ''
  });

  const handle = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [k]: e.target.value });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = [
      `Name: ${form.name}`, `Email: ${form.email}`, `Purpose: ${form.purpose}`, ``,
      `Scope:\n${form.scope}`, ``,
      `Budget:\n${form.budget}`, ``,
      `Risk:\n${form.risk}`, ``,
      `Timeline: ${form.timeline} business days`, ``,
      `Stakeholder sign-off:\n${form.signoff}`
    ].join('\n');
    const subject = `Artifact Virtual // ${form.purpose.toUpperCase()} // ${form.name || 'contact'}`;
    window.location.href = `mailto:ali.shakil@artifactvirtual.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  return (
    <div className="w-full h-full flex items-start overflow-y-auto px-6 md:px-12 py-16 relative">
      {/* Top accent line removed for clean headers */}
      <div className="max-w-4xl w-full space-y-10 relative z-10">
        {/* Header — matching other sections */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            <span className="text-[9px] font-mono font-bold tracking-[0.4em] uppercase text-white/40">AV / CONTACT</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-white/90 leading-none">CONTACT</h2>
          <p className="text-xs text-white/30 font-mono mt-2 tracking-wider">Operations · Board · Enterprise Engagements</p>
        </div>

        {/* Channels */}
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-5">01 / CHANNELS</p>
          <div className="space-y-3">
            <div className="border border-white/10 bg-white/[0.02] p-5 hover:border-white/25 hover:bg-white/[0.04] transition-all">
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/40 uppercase mb-2">OPERATIONS / BOARD</p>
              <p className="text-sm text-white/80 leading-relaxed">Ali A. Shakil — Owner, Board Director</p>
              <p className="font-mono text-[9px] text-white/30 mt-1">ID: 193011943382974466</p>
              <p className="text-[10px] text-white/30 mt-2 leading-relaxed">Audit requests, enterprise engagements, board-level decisions</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-5">02 / SUBMIT — CONTACT FORM</p>
          {submitted ? (
            <div className="border border-emerald-500/30 bg-emerald-500/5 p-6">
              <p className="font-mono text-[10px] tracking-[0.3em] text-emerald-400 uppercase mb-2">Submission packaged</p>
              <p className="text-white/50 text-xs leading-relaxed">Your mail client has been opened with the audit request pre-filled. Response SLA: 48h. Standard delivery: 10 business days.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="border border-white/10 bg-white/[0.015] p-6 md:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">Name</span>
                  <input required value={form.name} onChange={handle('name')} className="bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm text-white placeholder-white/20" placeholder="Your name" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">Email</span>
                  <input required type="email" value={form.email} onChange={handle('email')} className="bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm text-white placeholder-white/20" placeholder="you@domain.com" />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">Purpose</span>
                <select value={form.purpose} onChange={handle('purpose')} className="bg-black border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm text-white">
                  <option value="audit">Audit request</option>
                  <option value="services">Services inquiry</option>
                  <option value="enterprise">Enterprise contract</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">01 / Scope — deliverables, timelines, exclusions</span>
                <textarea required value={form.scope} onChange={handle('scope')} rows={3} className="bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm text-white placeholder-white/20 resize-none" placeholder="What are you building? What's in scope, what's out?" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">02 / Budget — line items + 15% contingency</span>
                <textarea required value={form.budget} onChange={handle('budget')} rows={3} className="bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm text-white placeholder-white/20 resize-none" placeholder="USD or PKR; line items; 15% contingency included" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">03 / Risk matrix — security, operational, economic</span>
                <textarea required value={form.risk} onChange={handle('risk')} rows={3} className="bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm text-white placeholder-white/20 resize-none" placeholder="Top risks + mitigations" />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">04 / Timeline (business days)</span>
                  <input value={form.timeline} onChange={handle('timeline')} className="bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm text-white placeholder-white/20" placeholder="10" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase">05 / Stakeholder sign-off (CTO / CFO / Sirius)</span>
                  <input value={form.signoff} onChange={handle('signoff')} className="bg-transparent border-b border-white/15 focus:border-white/60 outline-none py-2 text-sm text-white placeholder-white/20" placeholder="Names + roles" />
                </label>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="font-mono text-[9px] text-white/30 tracking-widest uppercase">Required: name, email, scope, budget, risk. Standard SLA 48h. Delivery 10 business days.</p>
                <button type="submit" className="px-6 py-2 border border-white/30 text-white font-mono text-[10px] tracking-widest uppercase hover:bg-white/10 hover:border-white/60 transition-all whitespace-nowrap">
                  Submit →
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="font-mono text-[8px] text-white/20 tracking-widest uppercase">ARTIFACT VIRTUAL / CONTACT / 2026</p>
      </div>
    </div>
  );
};

export default ContactDimension;
