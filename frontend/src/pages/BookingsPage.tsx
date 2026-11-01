import { BatteryCharging, CalendarDays, Clock3, Play, Square, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, Status } from "../components/UI";
import { bookingApi, sessionApi, type BookingRecord, type SessionRecord } from "../services/api";

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [energy, setEnergy] = useState("0");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [bookingResponse, sessionResponse] = await Promise.all([bookingApi.list(), sessionApi.list()]);
      setBookings(bookingResponse.data);
      setSessions(sessionResponse.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load bookings and sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function runAction(id: number, action: () => Promise<unknown>) {
    setSavingId(id);
    setError("");
    try {
      await action();
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The requested change could not be saved.");
    } finally {
      setSavingId(null);
    }
  }

  const activeSession = sessions.find((session) => session.status === "CHARGING");
  const activeEnergy = Number(energy);

  return <div>
    <div>
      <p className="text-sm font-medium text-emerald-600">Sessions</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-.035em]">Bookings & charging</h1>
      <p className="mt-2 text-sm text-slate-500">Your reservations and charging sessions saved in the network database.</p>
    </div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="mt-7 text-sm text-slate-500">Loading your saved bookings…</p> : <div className="mt-7 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <section className="rounded-2xl bg-slate-950 p-6 text-white md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400">{activeSession ? `Active session · #${activeSession.id}` : "Charging session"}</p>
            <h2 className="mt-2 text-xl font-semibold">{activeSession?.stationName ?? "No active session"}</h2>
            {activeSession && <p className="mt-1 text-xs text-slate-400">{activeSession.chargerCode} · started {formatDate(activeSession.startedAt)}</p>}
          </div>
          {activeSession && <Status>Charging</Status>}
        </div>
        {activeSession ? <>
          <div className="my-8 grid size-32 place-items-center rounded-full border-[8px] border-slate-800 border-t-emerald-400">
            <Zap size={31} className="text-emerald-400" fill="currentColor"/>
          </div>
          <label className="block text-xs font-medium text-slate-300">Energy delivered (kWh)
            <input type="number" min="0" step="0.1" value={energy} onChange={(event) => setEnergy(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-white"/>
          </label>
          <p className="mt-3 text-sm text-slate-400">Current saved energy: {Number(activeSession.energyKwh).toFixed(1)} kWh · total: ${Number(activeSession.totalCost).toFixed(2)}</p>
          <Button className="mt-5 w-full" disabled={savingId === activeSession.id || !Number.isFinite(activeEnergy) || activeEnergy < 0} onClick={() => void runAction(activeSession.id, () => sessionApi.stop(activeSession.id, activeEnergy))}>
            <Square size={15} fill="currentColor"/>{savingId === activeSession.id ? "Saving session…" : "Stop and save session"}
          </Button>
        </> : <p className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-slate-400">Start one of your booked reservations to create a persisted charging session.</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Your bookings</h2>
          <span className="text-xs text-slate-500">{bookings.length} total</span>
        </div>
        {bookings.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No bookings yet. Choose an available charger from Stations.</p> : <div className="mt-5 space-y-3">
          {bookings.map((booking) => {
            const starting = savingId === booking.id;
            return <article key={booking.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{booking.stationName}</h3>
                  <p className="mt-1 text-xs text-slate-500">{booking.chargerCode} · booking #{booking.id}</p>
                </div>
                <Status tone={booking.status === "BOOKED" ? "amber" : booking.status === "CHARGING" ? "green" : "slate"}>{booking.status.toLowerCase()}</Status>
              </div>
              <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600"><CalendarDays size={14}/><Clock3 size={14}/>{formatDate(booking.scheduledAt)}</div>
              {booking.status === "BOOKED" && <div className="mt-4 flex gap-2">
                <Button className="flex-1" disabled={savingId !== null} onClick={() => void runAction(booking.id, () => sessionApi.start(booking.id))}><Play size={14} fill="currentColor"/>{starting ? "Starting…" : "Start session"}</Button>
                <Button variant="secondary" disabled={savingId !== null} onClick={() => void runAction(booking.id, () => bookingApi.cancel(booking.id))}>Cancel</Button>
              </div>}
            </article>;
          })}
        </div>}
        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold">Saved records</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Bookings, session energy, costs, completion times, and payment records are written to PostgreSQL by the backend.</p>
        </div>
      </section>
    </div>}

    {!loading && sessions.length > 0 && <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2"><BatteryCharging size={18} className="text-emerald-600"/><h2 className="font-semibold">Saved session history</h2></div>
      <div className="mt-4 divide-y divide-slate-100">{sessions.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
        <div><p className="font-medium">{session.stationName} · {session.chargerCode}</p><p className="text-xs text-slate-500">{formatDate(session.startedAt)}</p></div>
        <div className="flex items-center gap-4 text-xs"><span>{Number(session.energyKwh).toFixed(1)} kWh</span><span>${Number(session.totalCost).toFixed(2)}</span><Status tone={session.status === "CHARGING" ? "green" : "slate"}>{session.status.toLowerCase()}</Status></div>
      </div>)}</div>
    </section>}
  </div>;
}
