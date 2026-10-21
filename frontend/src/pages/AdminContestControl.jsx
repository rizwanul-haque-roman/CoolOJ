import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

const panel = "rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl";
const input = "mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60 disabled:opacity-40";
const button = "rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40";
const dateText = value => value ? new Date(value).toLocaleString() : "—";
function localInput(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}
function isoInput(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Select a valid date and time.");
  date.setMilliseconds(0);
  return date.toISOString();
}
function statusOf(contest, now) {
  const start = Date.parse(contest.start_time);
  const end = Date.parse(contest.effective_end_time || contest.ended_at || contest.end_time);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "invalid";
  return now < start ? "upcoming" : now < end ? "live" : "ended";
}
function clockText(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60].map(n => String(n).padStart(2,"0")).join(":");
}
export default function AdminContestControl() {
  const { id } = useParams();
  return <Control key={id} id={id} />;
}
function Control({ id }) {
  const [contest, setContest] = useState(null);
  const [form, setForm] = useState({ title:"", description:"", start_time:"", end_time:"" });
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stale, setStale] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const controller = useRef(null);
  function apply(data) {
    if (!data || Number(data.id) !== Number(id) || !Number.isInteger(data.revision)) throw new Error("Unexpected contest response.");
    setContest(data);
    setForm({ title:data.title, description:data.description || "", start_time:localInput(data.start_time), end_time:localInput(data.end_time) });
    setOffset(Date.parse(data.server_time)-Date.now());
    setReason("");
    setStale(false);
  }
  useEffect(() => {
    const c = new AbortController();
    controller.current = c;
    async function load() {
      setLoading(true); setError("");
      try {
        if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new Error("Invalid contest ID.");
        const response = await api.get(`/admin/contests/${id}`, { signal:c.signal });
        if (!c.signal.aborted) apply(response.data);
      } catch (e) {
        if (!c.signal.aborted) setError(e.response?.data?.error || e.message || "Unable to load controls.");
      } finally { if (!c.signal.aborted) setLoading(false); }
    }
    load();
    return () => c.abort();
  }, [id, refresh]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const serverNow = now + offset;
  const status = contest ? statusOf(contest, serverNow) : "invalid";
  const canSchedule = status === "upcoming" || status === "live";
  function update(e) { setForm(previous => ({...previous, [e.target.name]:e.target.value})); }
  function changeMinutes(minutes) {
    try {
      const date = new Date(isoInput(form.end_time));
      date.setTime(date.getTime()+minutes*60000);
      setForm(previous => ({...previous, end_time:localInput(date)}));
    } catch (e) { setError(e.message); }
  }
  async function save(endNow = false) {
    if (lock.current || !contest || stale) return;
    setError(""); setMessage("");
    try {
      if (!reason.trim() || reason.trim().length > 1000) throw new Error("Enter a reason (maximum 1000 characters). Students will see it.");
      const body = { expected_revision:contest.revision, reason:reason.trim() };
      const changes = [];
      if (endNow) {
        if (status !== "live") throw new Error("Only a running contest can be ended.");
        changes.push("END THIS CONTEST NOW. Students cannot submit afterward. Reopening is unavailable.");
      } else {
        if (!form.title.trim() || Array.from(form.title.trim()).length > 200) throw new Error("Enter a title of up to 200 characters.");
        if (form.title.trim() !== contest.title) { body.title = form.title.trim(); changes.push(`Title: ${contest.title} → ${body.title}`); }
        if (form.description !== (contest.description || "")) { body.description = form.description; changes.push(`Description:\n${body.description}`); }
        const start = isoInput(form.start_time);
        const end = isoInput(form.end_time);
        if (start !== new Date(contest.start_time).toISOString()) { body.start_time = start; changes.push(`Start: ${dateText(contest.start_time)} → ${dateText(start)}`); }
        if (end !== new Date(contest.end_time).toISOString()) { body.end_time = end; changes.push(`End: ${dateText(contest.end_time)} → ${dateText(end)}`); }
        if (body.start_time || body.end_time) {
          if (!canSchedule) throw new Error("This contest's schedule is locked.");
          if (Date.parse(end) <= Date.parse(start) || Date.parse(end) <= serverNow) throw new Error("End must be after the start and in the future.");
          if (status === "upcoming" && Date.parse(start) <= serverNow) throw new Error("The new start must remain in the future.");
          if (status === "live" && body.start_time) throw new Error("Start time is locked while running.");
        }
        if (changes.length === 0) throw new Error("No changes to save.");
      }
      if (!window.confirm([`Contest #${id}: ${contest.title}`, ...changes, `Reason / announcement: ${body.reason}`, "Confirm this action?"].join("\n\n"))) return;
      lock.current = true; setBusy(true);
      const config = { signal:controller.current?.signal };
      const response = endNow
        ? await api.post(`/admin/contests/${id}/end`, body, config)
        : await api.patch(`/admin/contests/${id}`, body, config);
      if (controller.current?.signal.aborted) return;
      apply(response.data.contest);
      setMessage(response.data.message || "Saved successfully.");
      // Refresh only announcements, without replacing the saved form.
      try {
        const latest = await api.get(`/admin/contests/${id}`, config);
        if (!controller.current?.signal.aborted) setContest(previous => ({...previous, announcements:latest.data.announcements || []}));
      } catch { /* The write already succeeded. */ }
    } catch (e) {
      if (controller.current?.signal.aborted) return;
      setError(e.response?.data?.error || e.message || "Unable to save.");
      if (lock.current) setStale(true);
    } finally { lock.current = false; setBusy(false); }
  }
  function reload() {
    if (busy) return;
    if (contest && !window.confirm("Reload the latest contest? Unsaved edits and the reason will be discarded.")) return;
    setRefresh(value => value+1);
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/admin/contests" className="text-sm font-semibold text-cyan-300">← Contest management</Link>
      <button className={button} disabled={busy || loading} onClick={reload}>Reload latest</button>
    </div>
    {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-200">{message}</p>}
    {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-200">{error}{stale && <p className="mt-2 text-sm">Reload latest before trying another change. Your previous request may have completed.</p>}</div>}
    {loading ? <div className={panel}>Loading contest controls...</div> : contest ? <>
      <section className={panel}>
        <div className="flex flex-wrap justify-between gap-3"><span className="text-xs uppercase tracking-widest text-cyan-300">Contest #{contest.id} · Revision {contest.revision}</span><span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${status === "live" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-slate-300"}`}>{status}</span></div>
        <h2 className="mt-3 text-2xl font-bold text-white">{contest.title}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
          ["Starts", dateText(contest.start_time)], ["Scheduled end", dateText(contest.end_time)], ["Actual early closure", dateText(contest.ended_at)], [status === "upcoming" ? "Starts in" : "Time remaining", clockText((Date.parse(status === "upcoming" ? contest.start_time : (contest.effective_end_time || contest.end_time))-serverNow)/1000)],
        ].map(([label,value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 font-mono text-sm text-slate-100">{status === "ended" && label === "Time remaining" ? "00:00:00" : value}</p></div>)}</div>
        <p className="mt-4 text-xs text-slate-500">Dates use your browser timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Server time: {dateText(serverNow)}.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link className={button} to={`/contests/${id}`} target="_blank" rel="noopener noreferrer">Student page ↗</Link><Link className={button} to={`/contests/${id}/leaderboard`} target="_blank" rel="noopener noreferrer">Leaderboard ↗</Link></div>
      </section>
      <form className={`${panel} space-y-5`} onSubmit={e => { e.preventDefault(); save(false); }}>
        <h3 className="text-xl font-bold text-white">Details & schedule</h3>
        <fieldset disabled={busy || stale} className="space-y-5 disabled:opacity-60">
          <label className="block text-sm text-slate-300">Title<input className={input} name="title" value={form.title} onChange={update} required maxLength={200}/></label>
          <label className="block text-sm text-slate-300">Description<textarea className={input} name="description" value={form.description} onChange={update} rows={3}/></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-300">Start time<input type="datetime-local" step="1" className={input} name="start_time" value={form.start_time} onChange={update} disabled={status !== "upcoming"} required/></label><label className="block text-sm text-slate-300">Scheduled end time<input type="datetime-local" step="1" className={input} name="end_time" value={form.end_time} onChange={update} disabled={!canSchedule} required/></label></div>
          <div className="flex flex-wrap gap-2">{[-15,-5,5,10,15,30].map(minutes => <button key={minutes} type="button" disabled={!canSchedule} className={button} onClick={() => changeMinutes(minutes)}>{minutes > 0 ? "+" : ""}{minutes} min</button>)}</div>
          <p className="text-xs text-slate-500">Time buttons change the draft deadline only. Click Save changes to apply. Started contests keep their original start time; ended contests cannot reopen.</p>
          <label className="block text-sm text-slate-300">Reason / announcement to students<textarea className={input} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={2} required placeholder="Explain the change. Students will see this reason."/></label>
          <button className={button} type="submit">{busy ? "Saving..." : "Save changes"}</button>
        </fieldset>
      </form>
      <section className="rounded-3xl border border-rose-400/20 bg-rose-400/[0.04] p-6">
        <h3 className="font-bold text-rose-200">End contest now</h3><p className="mt-2 text-sm text-slate-400">Stops new contest submissions. Already admitted submissions can finish judging. This version cannot reopen the contest. Enter a reason above first.</p>
        <button type="button" disabled={busy || stale || status !== "live"} onClick={() => save(true)} className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-sm font-semibold text-rose-200 disabled:opacity-40">End contest now</button>
      </section>
      <section className={panel}><h3 className="text-xl font-bold text-white">Recent announcements</h3><div className="mt-4 space-y-3">{contest.announcements?.length ? contest.announcements.map(item => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-slate-500">Revision {item.contest_revision} · {dateText(item.created_at)}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{item.message}</p></article>) : <p className="text-sm text-slate-500">No announcements yet.</p>}</div></section>
    </> : <Link to="/login" className={button}>Log in with an administrator account</Link>}
  </div>;
}
