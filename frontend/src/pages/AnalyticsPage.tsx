import { Download, TrendingUp } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, KpiCard } from "../components/UI";
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

function getDailySeries(sessions: SessionRecord[]) {
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

export function AnalyticsPage() {
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

  const dailyData = useMemo(() => getDailySeries(sessions), [sessions]);
  const utilization = overview.chargers ? (overview.occupiedChargers / overview.chargers) * 100 : 0;

  function download() {
    const rows = [
      ["session_id", "station", "charger", "started_at", "ended_at", "energy_kwh", "total_cost", "status"],
      ...sessions.map((session) => [
        String(session.id),
        session.stationName,
        session.chargerCode,
        session.startedAt,
        session.endedAt ?? "",
        String(session.energyKwh),
        String(session.totalCost),
        session.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "voltflow-saved-sessions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-medium text-emerald-600">Insights</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.035em]">Analytics & reports</h1><p className="mt-2 text-sm text-slate-500">Metrics and exports are calculated from records saved in PostgreSQL.</p></div>
      <Button onClick={download}><Download size={16}/>Export saved sessions</Button>
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Energy delivered" value={`${overview.energyKwh.toLocaleString()} kWh`} change="completed sessions" icon={<TrendingUp size={18}/>}/>
      <KpiCard label="Gross revenue" value={`$${overview.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} change="completed sessions" icon={<TrendingUp size={18}/>}/>
      <KpiCard label="Charger utilization" value={`${utilization.toFixed(1)}%`} change="currently occupied" icon={<TrendingUp size={18}/>}/>
      <KpiCard label="Completed sessions" value={overview.completedSessions.toLocaleString()} change="database" icon={<TrendingUp size={18}/>}/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Chart title="Weekly energy trend" subtitle="Energy from completed sessions, grouped by start date">
        <ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyData}><defs><linearGradient id="saved-energy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".3"/><stop offset="1" stopColor="#10b981" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Area dataKey="energy" type="monotone" stroke="#10b981" strokeWidth={2.5} fill="url(#saved-energy)"/></AreaChart></ResponsiveContainer>
      </Chart>
      <Chart title="Completed sessions by day" subtitle="Saved charging sessions over the last seven days">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={dailyData}><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="sessions" fill="#0f172a" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
      </Chart>
    </div>
  </div>;
}

function Chart({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p><div className="mt-7 h-72">{children}</div></section>;
}
