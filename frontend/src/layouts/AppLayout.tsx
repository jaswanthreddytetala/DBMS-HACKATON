import { Activity, BarChart3, Bell, CalendarDays, ChevronDown, LogOut, MapPin, Menu, Settings, Users, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Logo } from "../components/Logo";
import { Button } from "../components/UI";
import { useAuth, type UserRole } from "../context/AuthContext";

const linksByRole: Record<UserRole, { to: string; label: string; icon: typeof Activity }[]> = {
  ADMIN: [
    { to: "/app/dashboard", label: "Overview", icon: Activity },
    { to: "/app/stations", label: "Stations", icon: MapPin },
    { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/app/users", label: "Users", icon: Users },
  ],
  OPERATOR: [
    { to: "/app/dashboard", label: "Overview", icon: Activity },
    { to: "/app/stations", label: "Stations", icon: MapPin },
    { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  ],
  DRIVER: [
    { to: "/app/stations", label: "Stations", icon: MapPin },
    { to: "/app/bookings", label: "My bookings", icon: CalendarDays },
  ],
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Network operator",
  DRIVER: "Driver",
};

export function AppLayout() {
  const navigate = useNavigate();
  const { user, signOut, error: authError } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [compactLayout, setCompactLayout] = useState(() => localStorage.getItem("voltflow_compact_layout") === "true");

  useEffect(() => {
    localStorage.setItem("voltflow_compact_layout", String(compactLayout));
  }, [compactLayout]);

  function logOut() {
    signOut();
    navigate("/", { replace: true });
  }

  const initials = user?.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "VF";

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {mobileMenuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-slate-800 bg-slate-950 p-5 ${mobileMenuOpen ? "flex" : "hidden"} lg:flex`}>
      <div className="flex items-center justify-between"><Logo light/><button aria-label="Close navigation" className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 lg:hidden" onClick={() => setMobileMenuOpen(false)}><X size={18}/></button></div>
      <div className="mt-10"><p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Workspace</p><nav className="mt-3 space-y-1">{(user ? linksByRole[user.role] : []).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon size={18}/>{label}</NavLink>)}</nav></div>
      {user?.role !== "DRIVER" && <div className="mt-auto rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><div className="mb-3 grid size-9 place-items-center rounded-xl bg-emerald-400 text-slate-950"><Zap size={18}/></div><p className="text-sm font-semibold text-white">Network health</p><p className="mt-1 text-xs leading-5 text-slate-400">Live network data is available in Overview.</p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full w-[94%] rounded-full bg-emerald-400"/></div></div>}
      <button onClick={logOut} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"><LogOut size={17}/> Sign out</button>
    </aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3"><button aria-label="Open navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} className="grid size-9 place-items-center rounded-lg border border-slate-200 lg:hidden"><Menu size={18}/></button><div><p className="text-sm font-semibold text-slate-900">{user?.role === "DRIVER" ? "Driver workspace" : "Fleet Operations"}</p><p className="hidden text-xs text-slate-500 sm:block">San Francisco Network</p></div></div>
        <div className="flex items-center gap-2">
          <div className="relative"><button aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }} className="relative grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><Bell size={19}/></button>{notificationsOpen && <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Notifications</p><button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={16}/></button></div><p className="mt-3 text-sm text-slate-600">You’re up to date. New account and network alerts will appear here.</p></div>}</div>
          <div className="relative"><button aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100"><span className="grid size-8 place-items-center rounded-lg bg-slate-900 text-xs font-semibold text-white">{initials}</span><span className="hidden text-left sm:block"><span className="block text-xs font-semibold">{user?.fullName}</span><span className="block text-[11px] text-slate-500">{user ? roleLabels[user.role] : ""}</span></span><ChevronDown size={14} className="text-slate-400"/></button>{profileOpen && <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"><p className="truncate text-sm font-semibold">{user?.fullName}</p><p className="mt-1 truncate text-xs text-slate-500">{user?.email}</p><p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{user ? roleLabels[user.role] : ""}</p><button onClick={logOut} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"><LogOut size={15}/>Sign out</button></div>}</div>
          <button aria-label="Settings" onClick={() => setSettingsOpen(true)} className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><Settings size={18}/></button>
        </div>
      </header>
      <main className={`mx-auto max-w-[1500px] ${compactLayout ? "p-3 md:p-5" : "p-4 md:p-8"}`}><Outlet /></main>
      {authError && <p role="alert" className="fixed bottom-4 right-4 z-50 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg">{authError}</p>}
    </div>
    {settingsOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={() => setSettingsOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Preferences</p><h2 id="settings-title" className="mt-1 text-xl font-semibold">Workspace settings</h2></div><button aria-label="Close settings" onClick={() => setSettingsOpen(false)} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><label className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><span><span className="block text-sm font-semibold">Compact page spacing</span><span className="mt-1 block text-xs text-slate-500">Show more content on each page.</span></span><input type="checkbox" checked={compactLayout} onChange={(event) => setCompactLayout(event.target.checked)} className="size-4 accent-emerald-600"/></label><Button onClick={() => setSettingsOpen(false)} className="mt-5 w-full">Done</Button></section></div>}
  </div>;
}
