import { BatteryCharging, CircleDollarSign, Gauge, MapPin, Users, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { KpiCard, Status } from "../components/UI";
import { analyticsApi, type AnalyticsOverview, type SessionRecord } from "../services/api";

const emptyOverview: AnalyticsOverview = {
  stations: 0,
  chargers: 0,
  activeSessions: 0,
  completedSessions: 0,
  users: 0,
  availableChargers: 0,
  occupiedChargers: 0,
  offlineChargers: 0,
  energyKwh: 0,
  revenue: 0,
};

function lastSevenDays(sessions: SessionRecord[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return { date, day: date.toLocaleDateString(undefined, { weekday: "short" }), energy: 0, sessions: 0 };
  });
  for (const session of sessions) {
    if (session.status !== "COMPLETED") continue;
    const date = new Date(session.startedAt);
    date.setHours(0, 0, 0, 0);
    const day = days.find((item) => item.date.getTime() === date.getTime());
    if (day) {
      day.energy += Number(session.energyKwh);
      day.sessions += 1;
    }
  }
  return days.map(({ day, energy, sessions: count }) => ({ day, energy, sessions: count }));
}

export function DashboardPage() {
  const [overview, setOverview] = useState(emptyOverview);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([analyticsApi.overview(), analyticsApi.sessions()])
      .then(([overviewResponse, sessionResponse]) => {
        setOverview(overviewResponse.data);
        setSessions(sessionResponse.data);
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);

  const energyData = useMemo(() => lastSevenDays(sessions), [sessions]);
  const availability = overview.chargers ? Math.round((overview.availableChargers / overview.chargers) * 100) : 0;
  const recentSessions = sessions.slice(0, 5);

  return <div>
    <div>
      <p className="text-sm font-medium text-emerald-600">Live network data</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-.035em] text-slate-950">Charging network overview</h1>
      <p className="mt-2 text-sm text-slate-500">Counts, activity, energy and revenue calculated from saved PostgreSQL records.</p>
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <KpiCard label="Total stations" value={String(overview.stations)} change="database" icon={<MapPin size={19}/>}/>
      <KpiCard label="Total chargers" value={overview.chargers.toLocaleString()} change="database" icon={<BatteryCharging size={19}/>}/>
      <KpiCard label="Active sessions" value={String(overview.activeSessions)} change="database" icon={<Zap size={19}/>}/>
      <KpiCard label="Registered users" value={overview.users.toLocaleString()} change="database" icon={<Users size={19}/>}/>
      <KpiCard label="Energy delivered" value={`${overview.energyKwh.toLocaleString()} kWh`} change="completed sessions" icon={<Gauge size={19}/>}/>
      <KpiCard label="Revenue" value={`$${overview.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} change="completed sessions" icon={<CircleDollarSign size={19}/>}/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Energy consumption</h2><p className="mt-1 text-xs text-slate-500">Saved completed charging sessions · last seven days</p></div><div className="text-right"><p className="text-xl font-semibold">{overview.energyKwh.toLocaleString()} <span className="text-xs font-normal text-slate-400">kWh total</span></p></div></div>
        <div className="mt-7 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={energyData}><defs><linearGradient id="energy" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={.25}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:"#94a3b8",fontSize:12}} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#94a3b8",fontSize:11}} width={44}/><Tooltip contentStyle={{borderRadius:12,border:"1px solid #e2e8f0",boxShadow:"0 8px 24px rgba(15,23,42,.08)"}}/><Area type="monotone" dataKey="energy" stroke="#10b981" strokeWidth={2.5} fill="url(#energy)"/></AreaChart></ResponsiveContainer></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="font-semibold">Charger availability</h2><p className="mt-1 text-xs text-slate-500">Current status stored in the database</p>
        <div className="mx-auto my-7 grid size-40 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 0 ${availability}%,#f59e0b ${availability}% ${overview.chargers ? ((overview.availableChargers + overview.occupiedChargers) / overview.chargers) * 100 : availability}%,#e2e8f0 0)` }}><div className="grid size-28 place-items-center rounded-full bg-white text-center"><div><p className="text-3xl font-semibold">{availability}%</p><p className="text-[11px] text-slate-500">Available</p></div></div></div>
        <div className="grid grid-cols-3 gap-2">{[["Available", overview.availableChargers, "bg-emerald-500"], ["Occupied", overview.occupiedChargers, "bg-amber-500"], ["Offline", overview.offlineChargers, "bg-slate-300"]].map(([label, count, color]) => <div key={String(label)} className="text-center"><span className={`mx-auto mb-2 block size-2 rounded-full ${color}`}/><p className="text-sm font-semibold">{count}</p><p className="text-[10px] text-slate-500">{label}</p></div>)}</div>
      </section>
    </div>
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Recent charging sessions</h2><p className="mt-1 text-xs text-slate-500">Most recent sessions recorded in PostgreSQL</p></div>
      {recentSessions.length === 0 ? <p className="p-5 text-sm text-slate-500">No charging sessions have been recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{["Station", "Charger", "Started", "Energy", "Cost", "Status"].map((item) => <th key={item} className="px-5 py-3 font-semibold">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{recentSessions.map((session) => <tr key={session.id} className="text-xs hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">{session.stationName}</td><td className="px-5 py-4 text-slate-500">{session.chargerCode}</td><td className="px-5 py-4 text-slate-500">{new Date(session.startedAt).toLocaleString()}</td><td className="px-5 py-4">{Number(session.energyKwh).toFixed(1)} kWh</td><td className="px-5 py-4 font-semibold">${Number(session.totalCost).toFixed(2)}</td><td className="px-5 py-4"><Status tone={session.status === "CHARGING" ? "green" : "slate"}>{session.status.toLowerCase()}</Status></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
