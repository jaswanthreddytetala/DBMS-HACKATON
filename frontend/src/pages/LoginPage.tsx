import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Logo } from "../components/Logo";
import { Button } from "../components/UI";
import { homePathForRole, useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState("admin@voltflow.com");
  const [password, setPassword] = useState("VoltFlow@2026");
  const [fullName, setFullName] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to={homePathForRole(user.role)} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = creatingAccount
        ? await authApi.register({ fullName, email, password })
        : await authApi.login(email, password);
      signIn(data);
      navigate(homePathForRole(data.role), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="grid min-h-screen bg-white lg:grid-cols-2">
    <div className="flex min-h-screen flex-col px-6 py-7 md:px-14 lg:px-20">
      <div className="flex justify-between"><Logo/><Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={15}/>Back home</Link></div>
      <div className="my-auto mx-auto w-full max-w-md py-16">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{creatingAccount ? "Join VoltFlow" : "Welcome back"}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-.04em]">{creatingAccount ? "Create your account" : "Sign in to VoltFlow"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Manage your charging network and see what needs your attention.</p>
        <form onSubmit={submit} className="mt-9 space-y-5">
          {creatingAccount && <label className="block"><span className="mb-2 block text-sm font-semibold">Full name</span><input required maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"/></label>}
          <label className="block"><span className="mb-2 block text-sm font-semibold">Email address</span><span className="relative block"><Mail size={17} className="absolute left-3.5 top-3.5 text-slate-400"/><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"/></span></label>
          <label className="block"><span className="mb-2 flex justify-between text-sm font-semibold">Password {!creatingAccount && <button type="button" onClick={() => setError("Password resets are managed by your network administrator.")} className="text-xs text-emerald-600">Forgot password?</button>}</span><span className="relative block"><LockKeyhole size={17} className="absolute left-3.5 top-3.5 text-slate-400"/><input required minLength={creatingAccount ? 8 : undefined} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button className="h-12 w-full" disabled={loading}>{loading ? "Please wait…" : creatingAccount ? "Create account" : "Sign in securely"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">{creatingAccount ? "Already registered?" : "New to VoltFlow?"} <button type="button" onClick={() => { setCreatingAccount(!creatingAccount); setError(""); }} className="font-semibold text-emerald-600">{creatingAccount ? "Sign in" : "Create an account"}</button></p>
        {creatingAccount && <p className="mt-4 text-center text-xs text-slate-500">New accounts receive Driver access. An administrator can promote trusted users to Operator.</p>}
      </div>
      <p className="flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={14}/>Protected with enterprise-grade encryption</p>
    </div>
    <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-end lg:p-16">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px]"/>
      <div className="absolute left-[55%] top-[30%] size-96 rounded-full bg-emerald-400/15 blur-3xl"/>
      <div className="relative max-w-lg"><p className="text-3xl font-medium leading-snug tracking-tight text-white">“VoltFlow gives our operations team one clear view of every station, charger and session.”</p><div className="mt-8 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-emerald-400 font-semibold text-slate-950">JL</span><div><p className="text-sm font-semibold text-white">Jordan Lee</p><p className="text-xs text-slate-500">Network Operations Director</p></div></div></div>
    </div>
  </div>;
}
