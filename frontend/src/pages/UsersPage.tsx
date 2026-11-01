import { RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, Status } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { usersApi, type ManagedUser } from "../services/api";

const roles: ManagedUser["role"][] = ["ADMIN", "OPERATOR", "DRIVER"];

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [savedUsers, setSavedUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setError("");
    try {
      const { data } = await usersApi.list();
      setUsers(data);
      setSavedUsers(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load user accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function changeUser(id: number, patch: Partial<Pick<ManagedUser, "role" | "enabled">>) {
    setUsers((current) => current.map((account) => account.id === id ? { ...account, ...patch } : account));
    setMessage("");
  }

  async function saveUser(account: ManagedUser) {
    setSavingId(account.id);
    setError("");
    setMessage("");
    try {
      const { data } = await usersApi.update(account.id, {
        fullName: account.fullName,
        role: account.role,
        enabled: account.enabled,
      });
      setUsers((current) => current.map((entry) => entry.id === account.id ? data : entry));
      setSavedUsers((current) => current.map((entry) => entry.id === account.id ? data : entry));
      setMessage(`Updated access for ${data.fullName}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this account.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeUser(account: ManagedUser) {
    if (!window.confirm(`Permanently delete ${account.fullName}'s account?`)) return;
    setSavingId(account.id);
    setError("");
    setMessage("");
    try {
      await usersApi.remove(account.id);
      setUsers((current) => current.filter((entry) => entry.id !== account.id));
      setSavedUsers((current) => current.filter((entry) => entry.id !== account.id));
      setMessage(`Deleted ${account.fullName}'s account.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this account.");
    } finally {
      setSavingId(null);
    }
  }

  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-medium text-emerald-600">Administration</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.035em]">User access</h1><p className="mt-2 text-sm text-slate-500">Assign the access each account needs. Role changes are enforced by the API.</p></div>
      <Button variant="secondary" disabled={loading} onClick={() => void loadUsers()}><RefreshCw size={15}/>Refresh users</Button>
    </div>
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {roles.map((role) => <div key={role} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600"/><h2 className="text-sm font-semibold">{role}</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">{role === "ADMIN" ? "Manage all accounts, stations, and network reports." : role === "OPERATOR" ? "Operate stations and review network analytics." : "Discover stations and manage personal bookings and charging sessions."}</p></div>)}
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><div className="flex items-center gap-2"><Users size={18} className="text-emerald-600"/><h2 className="font-semibold">Registered accounts</h2></div><p className="mt-1 text-xs text-slate-500">{users.length} accounts · changes take effect on the next API request</p></div></div>
      {loading ? <p className="p-5 text-sm text-slate-500">Loading user accounts…</p> : users.length === 0 ? <p className="p-5 text-sm text-slate-500">No user accounts found.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Account</th><th className="px-5 py-3 font-semibold">Access role</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Created</th><th className="px-5 py-3 font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((account) => {
        const isCurrentUser = account.id === currentUser?.userId;
        const original = savedUsers.find((entry) => entry.id === account.id);
        const dirty = Boolean(original && (original.role !== account.role || original.enabled !== account.enabled));
        const busy = savingId === account.id;
        return <tr key={account.id} className="text-sm">
          <td className="px-5 py-4"><p className="font-semibold">{account.fullName}{isCurrentUser && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}</p><p className="mt-1 text-xs text-slate-500">{account.email}</p></td>
          <td className="px-5 py-4"><select aria-label={`Role for ${account.email}`} disabled={isCurrentUser || busy} value={account.role} onChange={(event) => changeUser(account.id, { role: event.target.value as ManagedUser["role"] })} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-50">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></td>
          <td className="px-5 py-4"><div className="flex items-center gap-2"><input aria-label={`Enable ${account.email}`} type="checkbox" checked={account.enabled} disabled={isCurrentUser || busy} onChange={(event) => changeUser(account.id, { enabled: event.target.checked })} className="size-4 accent-emerald-600"/><Status tone={account.enabled ? "green" : "slate"}>{account.enabled ? "Enabled" : "Disabled"}</Status></div></td>
          <td className="px-5 py-4 text-xs text-slate-500">{new Date(account.createdAt).toLocaleDateString()}</td>
          <td className="px-5 py-4"><div className="flex items-center gap-2"><Button disabled={!dirty || busy || isCurrentUser} onClick={() => void saveUser(account)} className="h-9 px-3 text-xs">{busy ? "Saving…" : "Save"}</Button><button aria-label={`Delete ${account.email}`} disabled={isCurrentUser || busy} onClick={() => void removeUser(account)} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16}/></button></div></td>
        </tr>;
      })}</tbody></table></div>}
    </section>
  </div>;
}
