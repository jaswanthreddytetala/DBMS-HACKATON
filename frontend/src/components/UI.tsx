import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = { primary: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm", secondary: "bg-white text-slate-900 border border-slate-200 hover:border-slate-300", ghost: "text-slate-600 hover:bg-slate-100" };
  return <button className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all active:scale-[.98] ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

export function SectionTitle({ eyebrow, title, description, center = false }: { eyebrow: string; title: string; description?: string; center?: boolean }) {
  return <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}><p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">{eyebrow}</p><h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">{title}</h2>{description && <p className="mt-5 text-base leading-7 text-slate-600">{description}</p>}</div>;
}

export function KpiCard({ label, value, change, icon }: { label: string; value: string; change: string; icon: ReactNode }) {
  return <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"><div className="mb-5 flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700">{icon}</span><span className="flex items-center text-xs font-semibold text-emerald-600">{change}<ArrowUpRight size={13} /></span></div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p></div>;
}

export function Status({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "slate" }) {
  const tones = { green: "bg-emerald-50 text-emerald-700 ring-emerald-600/10", amber: "bg-amber-50 text-amber-700 ring-amber-600/10", slate: "bg-slate-100 text-slate-600 ring-slate-500/10" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}><span className="size-1.5 rounded-full bg-current" />{children}</span>;
}
