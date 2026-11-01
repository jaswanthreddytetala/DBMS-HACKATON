import { BatteryCharging, Filter, List, Map, MapPin, Plus, Search, SlidersHorizontal, Zap } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Button, Status } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { bookingApi, stationApi } from "../services/api";
import "leaflet/dist/leaflet.css";

type Charger = {
  id: number;
  code: string;
  connectorType: string;
  powerKw: number;
  status: string;
};

type Station = {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  pricePerKwh: number;
  available: boolean;
  chargers: Charger[];
};

function localDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function StationsPage() {
  const { user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "BUSY">("ALL");
  const [connectorFilter, setConnectorFilter] = useState("ALL");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<Station | null>(null);
  const [chargerId, setChargerId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(() => localDate(new Date(Date.now() + 86_400_000)));
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [addingStation, setAddingStation] = useState(false);
  const [newStation, setNewStation] = useState({ name: "", address: "", city: "", latitude: "", longitude: "", pricePerKwh: "", operatingHours: "24/7" });

  useEffect(() => {
    stationApi.list()
      .then(({ data }) => setStations(data))
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  const connectorTypes = useMemo(
    () => [...new Set(stations.flatMap((station) => station.chargers.map((charger) => charger.connectorType)))].sort(),
    [stations],
  );
  const filtered = useMemo(() => stations.filter((station) => {
    const matchesSearch = `${station.name} ${station.address} ${station.city}`.toLowerCase().includes(search.toLowerCase());
    const hasAvailableCharger = station.chargers.some((charger) => charger.status === "AVAILABLE");
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "AVAILABLE" ? hasAvailableCharger : !hasAvailableCharger);
    const matchesConnector = connectorFilter === "ALL" || station.chargers.some((charger) => charger.connectorType === connectorFilter);
    return matchesSearch && matchesStatus && matchesConnector;
  }), [stations, search, statusFilter, connectorFilter]);
  const canManageStations = user?.role === "ADMIN" || user?.role === "OPERATOR";
  const mapCenter: [number, number] = stations.length
    ? [
      stations.reduce((sum, station) => sum + station.latitude, 0) / stations.length,
      stations.reduce((sum, station) => sum + station.longitude, 0) / stations.length,
    ]
    : [37.7749, -122.4194];

  function openBooking(station: Station) {
    const firstAvailable = station.chargers.find((charger) => charger.status === "AVAILABLE");
    if (!firstAvailable) {
      setToast("There are no available chargers at this station");
      return;
    }
    setSelected(station);
    setChargerId(String(firstAvailable.id));
    setError("");
  }

  async function confirmBooking() {
    if (!selected || !chargerId || !scheduledDate || !scheduledTime) {
      setError("Choose an available charger, date, and time.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await bookingApi.create({
        chargerId: Number(chargerId),
        scheduledAt: new Date(`${scheduledDate}T${scheduledTime}`).toISOString(),
      });
      setToast("Booking saved successfully");
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the booking.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createStation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { data } = await stationApi.create({
        ...newStation,
        latitude: Number(newStation.latitude),
        longitude: Number(newStation.longitude),
        pricePerKwh: Number(newStation.pricePerKwh),
        available: true,
        chargers: [
          { code: "CH-01", connectorType: "CCS2", powerKw: 60, status: "AVAILABLE" },
          { code: "CH-02", connectorType: "Type 2", powerKw: 22, status: "AVAILABLE" },
        ],
      });
      setStations((current) => [...current, data]);
      setAddingStation(false);
      setNewStation({ name: "", address: "", city: "", latitude: "", longitude: "", pricePerKwh: "", operatingHours: "24/7" });
      setToast("Station saved successfully");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the station.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-medium text-emerald-600">Network</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-.035em]">Charging stations</h1>
        <p className="mt-2 text-sm text-slate-500">Monitor availability, performance and pricing across every location.</p>
      </div>
      {canManageStations && <Button onClick={() => { setError(""); setAddingStation(true); }}><Plus size={16}/>Add station</Button>}
    </div>

    <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:flex-row">
      <label className="relative flex-1">
        <Search size={17} className="absolute left-3.5 top-3 text-slate-400"/>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by station, city or address…" className="h-10 w-full rounded-xl bg-slate-50 pl-10 pr-4 text-sm outline-none ring-1 ring-inset ring-slate-200 focus:ring-emerald-500"/>
      </label>
      <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium"><Filter size={16}/><span className="sr-only">Filter stations by availability</span><select aria-label="Filter stations by availability" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-full bg-transparent outline-none"><option value="ALL">All statuses</option><option value="AVAILABLE">Available</option><option value="BUSY">Busy</option></select></label>
      <button aria-expanded={moreFiltersOpen} onClick={() => setMoreFiltersOpen((open) => !open)} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium"><SlidersHorizontal size={16}/>More filters</button>
      <div className="flex rounded-xl bg-slate-100 p-1">
        <button aria-label="List view" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} className={`grid size-8 place-items-center rounded-lg ${viewMode === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}><List size={16}/></button>
        <button aria-label="Map view" aria-pressed={viewMode === "map"} onClick={() => setViewMode("map")} className={`grid size-8 place-items-center rounded-lg ${viewMode === "map" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}><Map size={16}/></button>
      </div>
      {moreFiltersOpen && <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium md:w-56"><span className="shrink-0">Connector</span><select aria-label="Filter by connector" value={connectorFilter} onChange={(event) => setConnectorFilter(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none"><option value="ALL">All types</option>{connectorTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>}
    </div>

    {error && !selected && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="mt-8 text-sm text-slate-500">Loading stations…</p>
      : filtered.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 py-20 text-center"><Search className="mx-auto text-slate-300"/><p className="mt-4 font-semibold">No stations found</p><p className="mt-1 text-sm text-slate-500">Try another search or check that the backend has station data.</p></div>
      : viewMode === "map" ? <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-[480px]"><MapContainer center={mapCenter} zoom={11} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {filtered.filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude)).map((station) => <CircleMarker key={station.id} center={[station.latitude, station.longitude]} radius={9} pathOptions={{ color: "#047857", fillColor: "#10b981", fillOpacity: 0.9 }}><Popup><strong>{station.name}</strong><br/>{station.address}, {station.city}<br/>{station.chargers.filter((charger) => charger.status === "AVAILABLE").length} available chargers</Popup></CircleMarker>)}
        </MapContainer></div>
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Map tiles © OpenStreetMap contributors. Select a marker for station details.</p>
      </section>
      : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{filtered.map((station) => {
        const availableChargers = station.chargers.filter((charger) => charger.status === "AVAILABLE");
        const maxPower = station.chargers.reduce((max, charger) => Math.max(max, charger.powerKw), 0);
        const connectorTypes = [...new Set(station.chargers.map((charger) => charger.connectorType))].join(" · ") || "No chargers";
        return <article key={station.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/60">
          <div className="relative h-32 overflow-hidden bg-slate-900">
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(30deg,transparent_45%,#64748b_46%,#64748b_48%,transparent_49%),linear-gradient(-30deg,transparent_45%,#475569_46%,#475569_48%,transparent_49%)] [background-size:50px_50px]"/>
            <div className="absolute left-[55%] top-[40%] grid size-9 place-items-center rounded-full bg-emerald-400 text-slate-950 shadow-[0_0_0_8px_rgba(52,211,153,.15)]"><Zap size={16} fill="currentColor"/></div>
            <div className="absolute left-3 top-3"><Status tone={availableChargers.length ? "green" : "amber"}>{availableChargers.length ? "Available" : "Busy"}</Status></div>
          </div>
          <div className="p-4">
            <h2 className="font-semibold">{station.name}</h2>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={12}/>{station.address}, {station.city}</p>
            <div className="my-4 grid grid-cols-3 border-y border-slate-100 py-3 text-center">
              <div><p className="text-sm font-semibold text-emerald-600">{availableChargers.length}/{station.chargers.length}</p><p className="text-[10px] text-slate-500">Available</p></div>
              <div className="border-x border-slate-100"><p className="text-sm font-semibold">{maxPower} kW</p><p className="text-[10px] text-slate-500">Max speed</p></div>
              <div><p className="text-sm font-semibold">${Number(station.pricePerKwh).toFixed(2)}</p><p className="text-[10px] text-slate-500">per kWh</p></div>
            </div>
            <div className="flex items-center justify-between gap-2"><p className="truncate text-[11px] text-slate-500">{connectorTypes}</p>{user?.role === "DRIVER" && <button disabled={!availableChargers.length} onClick={() => openBooking(station)} className="shrink-0 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">Book charger</button>}</div>
          </div>
        </article>;
      })}</div>}

    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={() => setSelected(null)}>
      <div onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><BatteryCharging size={21}/></span>
        <h2 className="mt-5 text-xl font-semibold">Reserve a charger</h2>
        <p className="mt-1 text-sm text-slate-500">{selected.name}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold">Date<input type="date" min={localDate(new Date())} value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"/></label>
          <label className="text-xs font-semibold">Time<input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"/></label>
        </div>
        <label className="mt-4 block text-xs font-semibold">Charger<select value={chargerId} onChange={(event) => setChargerId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal">
          {selected.chargers.filter((charger) => charger.status === "AVAILABLE").map((charger) => <option key={charger.id} value={charger.id}>{charger.code} · {charger.connectorType} · {charger.powerKw} kW</option>)}
        </select></label>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" disabled={submitting} onClick={() => setSelected(null)}>Cancel</Button>
          <Button className="flex-1" disabled={submitting} onClick={confirmBooking}>{submitting ? "Saving…" : "Confirm booking"}</Button>
        </div>
      </div>
    </div>}
    {addingStation && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={() => setAddingStation(false)}>
      <form onSubmit={createStation} onMouseDown={(event) => event.stopPropagation()} className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold">Add a charging station</h2>
        <p className="mt-1 text-sm text-slate-500">Two available chargers are added automatically: 60 kW CCS2 and 22 kW Type 2.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {([
            ["name", "Station name", "text"],
            ["address", "Address", "text"],
            ["city", "City", "text"],
            ["latitude", "Latitude", "number"],
            ["longitude", "Longitude", "number"],
            ["pricePerKwh", "Price per kWh", "number"],
            ["operatingHours", "Operating hours", "text"],
          ] as const).map(([field, label, type]) => <label key={field} className="text-xs font-semibold">{label}<input required type={type} step={type === "number" ? "any" : undefined} value={newStation[field]} onChange={(event) => setNewStation((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"/></label>)}
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" disabled={submitting} onClick={() => setAddingStation(false)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save station"}</Button>
        </div>
      </form>
    </div>}
    {toast && <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl"><span className="size-2 rounded-full bg-emerald-400"/>{toast}<button onClick={() => setToast("")} className="ml-2 text-slate-400">×</button></div>}
  </div>;
}
