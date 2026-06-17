import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "zerotoskill-secret";
const useMySql = Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);

const skillsSeed = [
  { id: "html", name: "HTML", description: "Understand page structure, semantics, and accessibility basics.", category: "Foundations", level: "Beginner" },
  { id: "css", name: "CSS", description: "Style layouts, control spacing, and make pages responsive.", category: "Foundations", level: "Beginner" },
  { id: "javascript", name: "JavaScript", description: "Learn programming logic, DOM updates, and async basics.", category: "Foundations", level: "Beginner to Intermediate" },
  { id: "git-github", name: "Git & GitHub", description: "Track changes, collaborate, and publish projects professionally.", category: "Workflow", level: "Beginner" },
  { id: "react", name: "React", description: "Build component-based user interfaces and manage state.", category: "Frontend", level: "Intermediate" },
  { id: "backend", name: "Backend", description: "Design APIs, validate input, and protect data.", category: "Full Stack", level: "Intermediate" },
  { id: "mysql", name: "MySQL", description: "Store users, skills, and progress in a relational database.", category: "Database", level: "Intermediate" },
  { id: "projects", name: "Projects", description: "Ship proof of skill that helps you become job ready.", category: "Portfolio", level: "Project Phase" },
];

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: "7d" });
}

function authGuard(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function createMemoryRepository() {
  const users = [];
  const progress = [];

  return {
    async registerUser({ name, email, password }) {
      const normalizedEmail = email.trim().toLowerCase();
      if (users.some((user) => user.email === normalizedEmail)) {
        throw new Error("This email is already registered.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { id: users.length + 1, name: name.trim(), email: normalizedEmail, password: hashedPassword };
      users.push(user);
      return user;
    },
    async loginUser({ email, password }) {
      const user = users.find((entry) => entry.email === email.trim().toLowerCase());
      if (!user) return null;
      const matches = await bcrypt.compare(password, user.password);
      return matches ? user : null;
    },
    async listSkills() {
      return skillsSeed;
    },
    async findSkill(id) {
      return skillsSeed.find((skill) => skill.id === id) ?? null;
    },
    async getProgress(userId) {
      return progress.filter((entry) => entry.userId === userId);
    },
    async markCompleted(userId, skillId) {
      const existing = progress.find((entry) => entry.userId === userId && entry.skillId === skillId);
      if (existing) {
        existing.status = "completed";
        existing.completedAt = new Date().toISOString();
        return existing;
      }

      const entry = {
        id: progress.length + 1,
        userId,
        skillId,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
      progress.push(entry);
      return entry;
    },
  };
}

async function createMySqlRepository() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
  });

  return {
    async registerUser({ name, email, password }) {
      const normalizedEmail = email.trim().toLowerCase();
      const [rows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
      if (rows.length) throw new Error("This email is already registered.");

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name.trim(), normalizedEmail, hashedPassword]);
      return { id: result.insertId, name: name.trim(), email: normalizedEmail, password: hashedPassword };
    },
    async loginUser({ email, password }) {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email.trim().toLowerCase()]);
      const user = rows[0];
      if (!user) return null;
      const matches = await bcrypt.compare(password, user.password);
      return matches ? user : null;
    },
    async listSkills() {
      const [rows] = await pool.query("SELECT id, name, description, category, level FROM skills ORDER BY FIELD(id, 'html','css','javascript','git-github','react','backend','mysql','projects')");
      return rows;
    },
    async findSkill(id) {
      const [rows] = await pool.query("SELECT id, name, description, category, level FROM skills WHERE id = ? LIMIT 1", [id]);
      return rows[0] ?? null;
    },
    async getProgress(userId) {
      const [rows] = await pool.query("SELECT id, user_id AS userId, skill_id AS skillId, status, completed_at AS completedAt FROM progress WHERE user_id = ? ORDER BY completed_at DESC", [userId]);
      return rows;
    },
    async markCompleted(userId, skillId) {
      const [rows] = await pool.query(
        "INSERT INTO progress (user_id, skill_id, status) VALUES (?, ?, 'completed') ON DUPLICATE KEY UPDATE status = VALUES(status), completed_at = CURRENT_TIMESTAMP",
        [userId, skillId]
      );
      return { id: rows.insertId || 0, userId, skillId, status: "completed", completedAt: new Date().toISOString() };
    },
  };
}

const repository = useMySql ? await createMySqlRepository().catch(() => createMemoryRepository()) : createMemoryRepository();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, backend: useMySql ? "mysql" : "memory" });
});

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    const user = await repository.registerUser({ name, email, password });
    return res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed." });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await repository.loginUser({ email, password });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Login failed." });
  }
});

app.get("/skills", async (_req, res) => {
  const skills = await repository.listSkills();
  res.json(skills);
});

app.get("/skills/:id", async (req, res) => {
  const skill = await repository.findSkill(req.params.id);
  if (!skill) {
    return res.status(404).json({ message: "Skill not found." });
  }

  return res.json(skill);
});

app.get("/progress", authGuard, async (req, res) => {
  const skills = await repository.listSkills();
  const progress = await repository.getProgress(req.user.id);
  const completed = progress.filter((entry) => entry.status === "completed").map((entry) => entry.skillId);
  const nextSkill = skills.find((skill) => !completed.includes(skill.id)) ?? null;

  res.json({
    completed,
    total: skills.length,
    percentage: skills.length ? Math.round((completed.length / skills.length) * 100) : 0,
    nextSkill,
    progress,
  });
});

app.post("/progress", authGuard, async (req, res) => {
  const { skillId } = req.body;
  if (!skillId) {
    return res.status(400).json({ message: "skillId is required." });
  }

  const skill = await repository.findSkill(skillId);
  if (!skill) {
    return res.status(404).json({ message: "Skill not found." });
  }

  const result = await repository.markCompleted(req.user.id, skillId);
  return res.json({ message: "Skill completed.", progress: result });
});

app.listen(port, () => {
  console.log(`ZeroToSkill API running on http://localhost:${port}`);
});
