import { apiDocs, databaseTables, webDevRoadmap, type Skill } from "./data";

export type User = {
  id: number;
  name: string;
  email: string;
};

export type Session = {
  token: string;
  user: User;
};

export type ProgressEntry = {
  id: number;
  userId: number;
  skillId: string;
  status: "completed" | "in-progress";
  completedAt: string;
};

type StoredUser = User & { password: string };

type Store = {
  users: StoredUser[];
  progress: ProgressEntry[];
  session: Session | null;
};

const STORAGE_KEY = "zerotoskill-store";
const NETWORK_DELAY = 240;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") || "";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadStore(): Store {
  if (!hasBrowserStorage()) {
    return { users: [], progress: [], session: null };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { users: [], progress: [], session: null };
  }

  try {
    return JSON.parse(raw) as Store;
  } catch {
    return { users: [], progress: [], session: null };
  }
}

function saveStore(store: Store) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function makeToken(user: User) {
  const payload = btoa(JSON.stringify({ id: user.id, email: user.email, issuedAt: Date.now() }));
  return `zts.${payload}.jwt`;
}

function wait() {
  return new Promise((resolve) => window.setTimeout(resolve, NETWORK_DELAY));
}

function cloneSkills() {
  return webDevRoadmap.map((skill) => ({ ...skill }));
}

async function remoteRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function mergeRemoteSkills(remoteSkills: Array<Partial<Skill> & { id: string }>) {
  return webDevRoadmap.map((skill) => {
    const remote = remoteSkills.find((item) => item.id === skill.id);
    return {
      ...skill,
      ...remote,
      tasks: skill.tasks,
      explanation: skill.explanation,
      miniProject: skill.miniProject,
    };
  });
}

export async function getApiCatalog() {
  await wait();
  return { apiDocs, databaseTables };
}

export async function getSkills() {
  if (API_BASE_URL) {
    try {
      const remoteSkills = await remoteRequest<Array<Partial<Skill> & { id: string }>>("/skills");
      return mergeRemoteSkills(remoteSkills);
    } catch {
      // Fall back to the local data model so the app still works without a live API.
    }
  }

  await wait();
  return cloneSkills();
}

export async function getSkill(id: string) {
  if (API_BASE_URL) {
    try {
      const remoteSkill = await remoteRequest<Partial<Skill> & { id: string }>(`/skills/${id}`);
      const localSkill = webDevRoadmap.find((skill) => skill.id === id) ?? null;
      return localSkill ? { ...localSkill, ...remoteSkill, tasks: localSkill.tasks, explanation: localSkill.explanation, miniProject: localSkill.miniProject } : null;
    } catch {
      // Fall back to the local catalog.
    }
  }

  await wait();
  return cloneSkills().find((skill) => skill.id === id) ?? null;
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  if (API_BASE_URL) {
    try {
      const response = await remoteRequest<Session>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      saveStore({ ...loadStore(), session: response });
      return response;
    } catch {
      // If the API is unavailable, continue with local persistence.
    }
  }

  await wait();
  const store = loadStore();
  const email = input.email.trim().toLowerCase();

  if (store.users.some((user) => user.email === email)) {
    throw new Error("This email is already registered.");
  }

  const user: StoredUser = {
    id: store.users.length + 1,
    name: input.name.trim(),
    email,
    password: input.password,
  };

  const session: Session = { user: { id: user.id, name: user.name, email: user.email }, token: makeToken(user) };
  saveStore({ ...store, users: [...store.users, user], session });
  return session;
}

export async function loginUser(input: { email: string; password: string }) {
  if (API_BASE_URL) {
    try {
      const response = await remoteRequest<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      saveStore({ ...loadStore(), session: response });
      return response;
    } catch {
      // If the API is unavailable, continue with local persistence.
    }
  }

  await wait();
  const store = loadStore();
  const email = input.email.trim().toLowerCase();
  const user = store.users.find((entry) => entry.email === email && entry.password === input.password);

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const session: Session = { user: { id: user.id, name: user.name, email: user.email }, token: makeToken(user) };
  saveStore({ ...store, session });
  return session;
}

export async function getSession() {
  await wait();
  return loadStore().session;
}

export async function logout() {
  await wait();
  const store = loadStore();
  saveStore({ ...store, session: null });
}

export async function getProgress(userId: number) {
  if (API_BASE_URL) {
    try {
      const session = loadStore().session;
      if (!session) return [];
      const response = await remoteRequest<{ progress: ProgressEntry[] }>("/progress", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      return response.progress.filter((entry) => entry.userId === userId);
    } catch {
      // If the API is unavailable, continue with local persistence.
    }
  }

  await wait();
  const store = loadStore();
  return store.progress.filter((entry) => entry.userId === userId);
}

export async function completeSkill(userId: number, skillId: string) {
  if (API_BASE_URL) {
    try {
      const session = loadStore().session;
      if (!session) throw new Error("Please sign in first.");

      const response = await remoteRequest<{ progress: ProgressEntry }>("/progress", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ skillId }),
      });
      return response.progress;
    } catch {
      // If the API is unavailable, continue with local persistence.
    }
  }

  await wait();
  const store = loadStore();
  const existingIndex = store.progress.findIndex((entry) => entry.userId === userId && entry.skillId === skillId);
  const entry: ProgressEntry = {
    id: existingIndex >= 0 ? store.progress[existingIndex].id : store.progress.length + 1,
    userId,
    skillId,
    status: "completed",
    completedAt: new Date().toISOString(),
  };

  const progress = [...store.progress];
  if (existingIndex >= 0) {
    progress[existingIndex] = entry;
  } else {
    progress.push(entry);
  }

  saveStore({ ...store, progress });
  return entry;
}
