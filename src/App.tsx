import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  completeSkill,
  getApiCatalog,
  getProgress,
  getSession,
  getSkills,
  loginUser,
  logout,
  registerUser,
  type ProgressEntry,
  type Session,
} from "./api";
import { apiDocs, databaseTables, learningPaths, webDevRoadmap, type Skill } from "./data";

type Page = "home" | "auth" | "dashboard" | "roadmap" | "skill" | "progress" | "api";
type AuthMode = "login" | "register";

const navItems: Array<{ id: Page; label: string }> = [
  { id: "home", label: "Home" },
  { id: "auth", label: "Auth" },
  { id: "dashboard", label: "Dashboard" },
  { id: "roadmap", label: "Roadmap" },
  { id: "skill", label: "Skill" },
  { id: "progress", label: "Progress" },
  { id: "api", label: "API" },
];

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [session, setSession] = useState<Session | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("html");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const [loadedSkills, storedSession, apiCatalog] = await Promise.all([getSkills(), getSession(), getApiCatalog()]);

      if (!active) return;

      setSkills(loadedSkills);
      setSession(storedSession);
      setApiReady(Boolean(apiCatalog));
      if (storedSession) {
        const storedProgress = await getProgress(storedSession.user.id);
        if (active) {
          setProgressEntries(storedProgress);
          const firstIncomplete = loadedSkills.find((skill) => !storedProgress.some((entry) => entry.skillId === skill.id && entry.status === "completed"));
          setSelectedSkillId(firstIncomplete?.id ?? loadedSkills[0]?.id ?? "html");
        }
      }

      if (active) {
        setLoading(false);
      }
    }

    bootstrap().catch(() => {
      if (active) {
        setLoading(false);
        setError("Unable to load ZeroToSkill data.");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (session) {
      getProgress(session.user.id).then(setProgressEntries).catch(() => undefined);
    } else {
      setProgressEntries([]);
    }
  }, [session]);

  const completedSkillIds = useMemo(
    () => new Set(progressEntries.filter((entry) => entry.status === "completed").map((entry) => entry.skillId)),
    [progressEntries]
  );

  const completedSkills = useMemo(() => skills.filter((skill) => completedSkillIds.has(skill.id)), [skills, completedSkillIds]);

  const nextSkill = useMemo(() => skills.find((skill) => !completedSkillIds.has(skill.id)) ?? skills[0] ?? null, [skills, completedSkillIds]);

  const progressPercent = useMemo(() => (skills.length ? Math.round((completedSkills.length / skills.length) * 100) : 0), [completedSkills.length, skills.length]);

  const selectedSkill = useMemo(() => {
    return skills.find((skill) => skill.id === selectedSkillId) ?? skills[0] ?? null;
  }, [selectedSkillId, skills]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      const response =
        authMode === "register"
          ? await registerUser({ name, email, password })
          : await loginUser({ email, password });

      setSession(response);
      setPage("dashboard");
      setNotice(authMode === "register" ? "Account created. Your session is ready." : "Welcome back. Your session is ready.");
      setName("");
      setEmail("");
      setPassword("");
      const latestProgress = await getProgress(response.user.id);
      setProgressEntries(latestProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    }
  }

  async function handleLogout() {
    await logout();
    setSession(null);
    setProgressEntries([]);
    setPage("home");
    setNotice("Signed out successfully.");
  }

  async function markCurrentSkillComplete() {
    if (!session || !selectedSkill) {
      setPage("auth");
      return;
    }

    setError(null);
    await completeSkill(session.user.id, selectedSkill.id);
    const updatedProgress = await getProgress(session.user.id);
    setProgressEntries(updatedProgress);
    setNotice(`${selectedSkill.name} is now marked complete.`);
    const followUp = skills.find((skill) => !updatedProgress.some((entry) => entry.skillId === skill.id && entry.status === "completed"));
    if (followUp) {
      setSelectedSkillId(followUp.id);
    }
    setPage("dashboard");
  }

  function openSkill(skillId: string) {
    setSelectedSkillId(skillId);
    setPage("skill");
  }

  const completedCount = completedSkills.length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-full border border-cyan-400/60 border-t-transparent" />
          <p className="text-sm tracking-[0.3em] text-cyan-300/70">Loading ZeroToSkill</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button onClick={() => setPage("home")} className="text-left">
            <div className="text-xs uppercase tracking-[0.45em] text-cyan-300/80">Created by Chunduru Sai</div>
            <div className="text-xl font-semibold text-white sm:text-2xl">ZeroToSkill</div>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  page === item.id ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Logged in</p>
                  <p className="text-sm text-slate-200">{session.user.name}</p>
                </div>
                <button onClick={handleLogout} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition hover:border-white/30 hover:bg-white/10">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={() => setPage("auth")} className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/20">
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {notice ? (
          <div className="border-b border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="border-b border-rose-400/20 bg-rose-400/10 px-4 py-3 text-center text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {page === "home" ? (
          <>
            <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(129,140,248,0.18),_transparent_30%),linear-gradient(180deg,_#07111f_0%,_#020617_100%)]">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute -left-24 top-14 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl animate-drift-slow" />
                <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl animate-drift-slower" />
              </div>

              <div className="relative mx-auto grid min-h-[100svh] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
                <div className="max-w-2xl animate-rise-in">
                  <p className="text-xs uppercase tracking-[0.55em] text-cyan-300/80">ZeroToSkill</p>
                  <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                    Learn Skills Through Real Projects.
                  </h1>
                  <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
                    Structured learning roadmaps, practical projects, and progress tracking designed to help students build real-world skills.
                  </p>

                  <div className="mt-10 flex flex-wrap gap-3">
                    <button
                      onClick={() => setPage(session ? "dashboard" : "auth")}
                      className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:translate-y-[-1px] hover:bg-cyan-50"
                    >
                      Start Learning
                    </button>
                    <button
                      onClick={() => setPage("roadmap")}
                      className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
                    >
                      View Roadmap
                    </button>
                  </div>

                  <div className="mt-12 border-t border-white/10 pt-8">
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Why beginners get stuck</p>
                    <div className="mt-5 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
                      <div className="border-b border-white/10 pb-4 sm:border-b-0 sm:border-r sm:pr-4">
                        They do not know what to learn.
                      </div>
                      <div className="border-b border-white/10 pb-4 sm:border-b-0 sm:border-r sm:px-4">
                        They do not know the correct order.
                      </div>
                      <div className="pb-4 sm:pl-4">
                        They waste time on random tutorials.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative flex min-h-[420px] items-center justify-center animate-fade-in-delayed">
                  <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-sm" />
                  <svg viewBox="0 0 640 520" className="relative h-full w-full max-w-2xl text-cyan-300">
                    <defs>
                      <linearGradient id="roadmapLine" x1="0" x2="1">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M120 420 C 220 330, 220 170, 320 150 C 410 132, 465 216, 530 95"
                      fill="none"
                      stroke="url(#roadmapLine)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="16 18"
                      className="animate-dash"
                    />

                    {[
                      { x: 120, y: 420, label: "HTML" },
                      { x: 220, y: 320, label: "CSS" },
                      { x: 285, y: 220, label: "JavaScript" },
                      { x: 390, y: 170, label: "React" },
                      { x: 530, y: 95, label: "Projects" },
                    ].map((node, index) => (
                      <g key={node.label} className="animate-pop-slow" style={{ animationDelay: `${index * 120}ms` }}>
                        <circle cx={node.x} cy={node.y} r="22" fill="#020617" stroke="url(#roadmapLine)" strokeWidth="6" />
                        <text x={node.x + 34} y={node.y + 5} className="fill-slate-100 text-[18px] font-semibold">
                          {node.label}
                        </text>
                      </g>
                    ))}

                    <text x="40" y="72" className="fill-slate-300 text-[14px] uppercase tracking-[0.4em]">Guided learning path</text>
                    <text x="40" y="106" className="fill-white text-[40px] font-semibold">Roadmap first.</text>
                    <text x="40" y="148" className="fill-slate-300 text-[18px]">One skill unlocks the next skill.</text>
                  </svg>
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="max-w-xl">
                  <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/70">Learning paths</p>
                  <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Pick a track and follow it in order.</h2>
                </div>

                <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
                  {learningPaths.map((path) => (
                    <div key={path.id} className="grid gap-4 py-6 md:grid-cols-[1fr_1fr_160px] md:items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{path.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{path.summary}</p>
                      </div>
                      <p className="text-sm leading-7 text-slate-400">{path.outcome}</p>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 md:text-right">{path.duration}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 bg-[#030712] px-4 py-16 sm:px-6 lg:px-8">
              <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/70">How it works</p>
                  <h2 className="mt-4 text-3xl font-semibold text-white">Daily guidance without clutter.</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["1", "Choose a path", "Web Development, Java Full Stack, or Python."],
                    ["2", "Track progress", "Mark skills complete and always see the next step."],
                    ["3", "Build projects", "Use mini projects to prove what you know."],
                  ].map(([step, title, text]) => (
                    <div key={title} className="border-b border-white/10 pb-5 sm:border-b-0 sm:border-r sm:pr-4 last:border-none last:pr-0">
                      <p className="text-sm text-cyan-300/80">{step}</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-300">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {page === "auth" ? (
          <section className="mx-auto grid min-h-[calc(100svh-82px)] max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-16">
            <div className="max-w-xl pt-6">
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300/70">Authentication</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">JWT login keeps progress tied to the right user.</h2>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Register with your name, email, and password, then keep your roadmap progress saved behind a protected session.
              </p>

              <div className="mt-10 space-y-4 border-l border-white/10 pl-5 text-sm text-slate-300">
                <p>Secure password hashing on the backend.</p>
                <p>Protected progress routes for signed-in users.</p>
                <p>JWT session tokens for login and registration.</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-sm sm:p-8">
              <div className="flex gap-2 rounded-full border border-white/10 bg-slate-950/80 p-1 text-sm">
                <button
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 rounded-full px-4 py-2 transition ${authMode === "register" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"}`}
                >
                  Register
                </button>
                <button
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 rounded-full px-4 py-2 transition ${authMode === "login" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"}`}
                >
                  Login
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="mt-8 space-y-5">
                {authMode === "register" ? (
                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Name</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                      placeholder="Chunduru Sai"
                    />
                  </label>
                ) : null}

                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Email</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Password</span>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                    placeholder="Choose a strong password"
                  />
                </label>

                <button className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-50">
                  {authMode === "register" ? "Create account" : "Login"}
                </button>
              </form>

              <p className="mt-5 text-xs leading-6 text-slate-400">
                Frontend uses the same contract as the Express backend. When a backend URL is supplied, the same endpoints can power the live app.
              </p>
            </div>
          </section>
        ) : null}

        {page === "dashboard" ? (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.45em] text-cyan-300/70">Dashboard</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">Your learning progress at a glance.</h2>
              </div>
              {session ? (
                <p className="text-sm text-slate-400">Signed in as {session.user.name}</p>
              ) : null}
            </div>

            {!session ? (
              <div className="py-16 text-center">
                <p className="text-lg text-slate-300">Sign in to track your roadmap progress.</p>
                <button onClick={() => setPage("auth")} className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950">
                  Go to Auth
                </button>
              </div>
            ) : (
              <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="pt-10">
                  <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Progress</p>
                  <div className="mt-4 flex items-end gap-4">
                    <div className="text-6xl font-semibold text-white">{formatPercent(progressPercent)}</div>
                    <div className="pb-2 text-sm text-slate-400">
                      {completedCount} of {skills.length} skills completed
                    </div>
                  </div>

                  <div className="mt-6 h-3 rounded-full bg-white/10">
                    <div className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>

                  <div className="mt-10 space-y-5 border-t border-white/10 pt-8 text-sm text-slate-300">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Completed skills</p>
                      <p className="mt-2 leading-7">{completedSkills.length ? completedSkills.map((skill) => skill.name).join(", ") : "No skills completed yet."}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Next skill</p>
                      <p className="mt-2 leading-7">{nextSkill ? nextSkill.name : "You completed the full roadmap."}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-10 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">Continue learning</h3>
                    <button onClick={() => nextSkill && openSkill(nextSkill.id)} className="text-sm text-cyan-300 transition hover:text-cyan-200">
                      Open next skill
                    </button>
                  </div>

                  <div className="divide-y divide-white/10 border-y border-white/10">
                    {skills.map((skill) => {
                      const completed = completedSkillIds.has(skill.id);
                      return (
                        <button key={skill.id} onClick={() => openSkill(skill.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-white/5">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className={`h-2.5 w-2.5 rounded-full ${completed ? "bg-emerald-400" : skill.id === nextSkill?.id ? "bg-cyan-400" : "bg-white/20"}`} />
                              <p className="text-base font-medium text-white">{skill.name}</p>
                            </div>
                            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">{skill.description}</p>
                          </div>
                          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{completed ? "Complete" : skill.id === nextSkill?.id ? "Next" : "Locked"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {page === "roadmap" ? (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300/70">Roadmap</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">Web Development Path</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">Move through the roadmap in a clear order. Each step builds the next step.</p>
            </div>

            <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
              {webDevRoadmap.map((skill, index) => {
                const completed = completedSkillIds.has(skill.id);
                const active = skill.id === nextSkill?.id;
                return (
                  <button key={skill.id} onClick={() => openSkill(skill.id)} className="grid w-full gap-4 py-6 text-left transition hover:bg-white/5 sm:grid-cols-[120px_1fr_160px] sm:items-start">
                    <div className="text-sm uppercase tracking-[0.35em] text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">{skill.name}</h3>
                        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] ${completed ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : active ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-slate-400"}`}>
                          {completed ? "Completed" : active ? "Next up" : skill.level}
                        </span>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{skill.description}</p>
                    </div>
                    <div className="text-sm text-slate-500 sm:text-right">{skill.category}</div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {page === "skill" ? (
          <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-16">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300/70">Skill detail</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">{selectedSkill?.name ?? "Pick a skill"}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">{selectedSkill?.explanation ?? "Choose a roadmap item to see the lesson details, tasks, and mini project."}</p>

              <div className="mt-8 space-y-4 border-t border-white/10 pt-8 text-sm text-slate-400">
                <p>Category: {selectedSkill?.category ?? "Roadmap"}</p>
                <p>Level: {selectedSkill?.level ?? "Beginner"}</p>
                <p>One clear next step at a time.</p>
              </div>
            </div>

            {selectedSkill ? (
              <div className="space-y-8 rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
                <div>
                  <h3 className="text-sm uppercase tracking-[0.4em] text-slate-400">Tasks</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
                    {selectedSkill.tasks.map((task) => (
                      <li key={task} className="flex gap-3 border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                        <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-[0.4em] text-slate-400">Mini project</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-200">{selectedSkill.miniProject}</p>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
                  <button onClick={markCurrentSkillComplete} className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-50">
                    Mark as completed
                  </button>
                  <button onClick={() => setPage("roadmap")} className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                    Back to roadmap
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {page === "progress" ? (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300/70">Progress tracker</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">Saved progress and your next recommendation.</h2>
            </div>

            {!session ? (
              <div className="py-16 text-center text-slate-300">
                Please sign in to save completed skills.
                <div>
                  <button onClick={() => setPage("auth")} className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950">
                    Sign in
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Completion</p>
                    <div className="mt-4 text-5xl font-semibold text-white">{formatPercent(progressPercent)}</div>
                    <div className="mt-5 h-3 rounded-full bg-white/10">
                      <div className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="mt-4 text-sm text-slate-400">{completedCount} completed of {skills.length} total skills.</p>
                  </div>

                  <div className="space-y-3 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Suggested next skill</p>
                    <p className="text-lg text-white">{nextSkill?.name ?? "Roadmap complete"}</p>
                    <p className="leading-7">{nextSkill?.description ?? "You have completed the full guided learning path."}</p>
                  </div>
                </div>

                <div className="divide-y divide-white/10 border-y border-white/10">
                  {skills.map((skill) => {
                    const completed = completedSkillIds.has(skill.id);
                    return (
                      <button key={skill.id} onClick={() => openSkill(skill.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-white/5">
                        <div>
                          <p className="text-base font-medium text-white">{skill.name}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-400">{skill.description}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] ${completed ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-slate-400"}`}>
                          {completed ? "Completed" : "Pending"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ) : null}

        {page === "api" ? (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-300/70">Backend contract</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">API routes and database structure.</h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {apiDocs.map((doc) => (
                  <div key={`${doc.method}-${doc.path}`} className="border-b border-white/10 pb-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">{doc.method}</span>
                      <p className="font-mono text-sm text-white">{doc.path}</p>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{doc.purpose}</p>
                    {doc.body ? <p className="mt-2 font-mono text-xs leading-6 text-slate-500">Body: {doc.body}</p> : null}
                    <p className="mt-2 font-mono text-xs leading-6 text-slate-500">Response: {doc.response}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h3 className="text-sm uppercase tracking-[0.4em] text-slate-400">Database tables</h3>
                <div className="mt-5 space-y-3 text-sm text-slate-200">
                  {databaseTables.map((table) => (
                    <div key={table} className="border-b border-white/10 pb-3 last:border-b-0">
                      {table}
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-white/10 pt-6 text-sm leading-7 text-slate-300">
                  {apiReady ? "Local API data is ready. Connect the frontend to the Express backend by setting a base URL in production." : "API data is preparing."}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => setPage("auth")} className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950">
                    Test auth flow
                  </button>
                  <button onClick={() => setPage("roadmap")} className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                    Open roadmap
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
        © 2026 ZeroToSkill | Created by Chunduru Sai
      </footer>
    </div>
  );
}

export default App;
