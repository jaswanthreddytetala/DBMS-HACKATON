import { Zap } from "lucide-react";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 font-semibold tracking-tight ${light ? "text-white" : "text-slate-950"}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-slate-950 shadow-sm"><Zap size={19} fill="currentColor" /></span>
      <span className="text-xl">VoltFlow</span>
    </div>
  );
}
