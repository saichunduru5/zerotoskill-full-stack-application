export type LearningPath = {
  id: string;
  title: string;
  summary: string;
  outcome: string;
  duration: string;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
  level: string;
  explanation: string;
  tasks: string[];
  miniProject: string;
};

export type ApiDoc = {
  method: string;
  path: string;
  purpose: string;
  body?: string;
  response: string;
};

export const learningPaths: LearningPath[] = [
  {
    id: "web-development",
    title: "Web Development",
    summary: "A beginner-first route from HTML fundamentals to deployed full-stack projects.",
    outcome: "Build and ship responsive websites with React, APIs, and MySQL.",
    duration: "10 to 14 weeks",
  },
  {
    id: "java-full-stack",
    title: "Java Full Stack",
    summary: "Learn Java, Spring Boot, SQL, and frontend basics in a structured order.",
    outcome: "Create enterprise-ready applications with clean backend architecture.",
    duration: "12 to 16 weeks",
  },
  {
    id: "python",
    title: "Python",
    summary: "Master Python basics, problem solving, automation, and data-oriented workflows.",
    outcome: "Use Python for scripting, backend development, and practical automation.",
    duration: "8 to 12 weeks",
  },
];

export const webDevRoadmap: Skill[] = [
  {
    id: "html",
    name: "HTML",
    description: "Understand page structure, semantics, and accessibility basics.",
    category: "Foundations",
    level: "Beginner",
    explanation: "HTML is the skeleton of every web page. Learn semantic tags, forms, media, and how search engines and screen readers read your layout.",
    tasks: ["Build a profile page with headings, sections, and lists", "Create a sign-up form with labels and inputs", "Use semantic tags like header, main, section, and footer"],
    miniProject: "A personal portfolio landing page with a contact form.",
  },
  {
    id: "css",
    name: "CSS",
    description: "Style layouts, control spacing, and make pages responsive.",
    category: "Foundations",
    level: "Beginner",
    explanation: "CSS turns plain structure into a polished experience. Focus on the box model, flexbox, grid, responsive design, and reusable utility patterns.",
    tasks: ["Recreate a simple pricing section", "Build a responsive two-column layout", "Practice flexbox and grid spacing rules"],
    miniProject: "A responsive personal homepage with a mobile-first layout.",
  },
  {
    id: "javascript",
    name: "JavaScript",
    description: "Learn programming logic, DOM updates, and async basics.",
    category: "Foundations",
    level: "Beginner to Intermediate",
    explanation: "JavaScript brings interaction to the browser. Learn variables, functions, arrays, objects, events, fetch, and the mental model for debugging.",
    tasks: ["Build a counter and todo list", "Fetch data from a public API", "Validate forms and show messages"],
    miniProject: "A habit tracker that saves tasks in local storage.",
  },
  {
    id: "git-github",
    name: "Git & GitHub",
    description: "Track changes, collaborate, and publish projects professionally.",
    category: "Workflow",
    level: "Beginner",
    explanation: "Git helps you save versions safely. GitHub helps you collaborate and present your work. Learn commits, branches, pull requests, and repository hygiene.",
    tasks: ["Initialize a repo and push code", "Create a feature branch and merge it", "Write a useful README"],
    miniProject: "Version-controlled project repository with issue notes and a release tag.",
  },
  {
    id: "react",
    name: "React",
    description: "Build component-based user interfaces and manage state.",
    category: "Frontend",
    level: "Intermediate",
    explanation: "React organizes UI into reusable components. Learn props, state, hooks, conditional rendering, and how to design clean component boundaries.",
    tasks: ["Create reusable components from an existing page", "Manage forms with controlled inputs", "Split logic into custom hooks"],
    miniProject: "A learning planner dashboard with filters and progress summaries.",
  },
  {
    id: "backend",
    name: "Backend",
    description: "Design APIs, validate input, and protect data.",
    category: "Full Stack",
    level: "Intermediate",
    explanation: "A backend receives requests, applies business logic, and returns structured responses. Learn REST APIs, authentication, validation, and error handling.",
    tasks: ["Create a REST endpoint for skills", "Add protected routes with JWT", "Validate and sanitize request payloads"],
    miniProject: "A small authentication and learning progress API.",
  },
  {
    id: "mysql",
    name: "MySQL",
    description: "Store users, skills, and progress in a relational database.",
    category: "Database",
    level: "Intermediate",
    explanation: "MySQL gives structure to your app data. Learn tables, primary keys, relationships, joins, indexes, and simple query design.",
    tasks: ["Design users, skills, and progress tables", "Write queries to fetch progress by user", "Update status without creating duplicates"],
    miniProject: "A normalized schema for a learning tracker application.",
  },
  {
    id: "projects",
    name: "Projects",
    description: "Ship proof of skill that helps you become job ready.",
    category: "Portfolio",
    level: "Project Phase",
    explanation: "Projects turn learning into proof. Focus on solving a real problem, writing a clear README, and deploying something you can demo confidently.",
    tasks: ["Plan one complete end-to-end project", "Add authentication and persistence", "Record a walkthrough demo"],
    miniProject: "A polished capstone that combines roadmap tracking, auth, and analytics.",
  },
];

export const apiDocs: ApiDoc[] = [
  {
    method: "POST",
    path: "/auth/register",
    purpose: "Create a new user, hash the password, and return a JWT session.",
    body: '{"name":"Sai","email":"sai@example.com","password":"secret123"}',
    response: '{"token":"jwt","user":{"id":1,"name":"Sai","email":"sai@example.com"}}',
  },
  {
    method: "POST",
    path: "/auth/login",
    purpose: "Verify credentials and issue a JWT session for the user.",
    body: '{"email":"sai@example.com","password":"secret123"}',
    response: '{"token":"jwt","user":{"id":1,"name":"Sai","email":"sai@example.com"}}',
  },
  {
    method: "GET",
    path: "/skills",
    purpose: "Return the guided learning roadmap.",
    response: '[{"id":"html","name":"HTML", "description":"..."}]',
  },
  {
    method: "GET",
    path: "/skills/:id",
    purpose: "Return one skill with tasks and a mini project.",
    response: '{"id":"react","name":"React","tasks":["..."]}',
  },
  {
    method: "GET",
    path: "/progress",
    purpose: "Return the signed-in user progress with percentage and suggested next skill.",
    response: '{"completed":3,"total":8,"percentage":38}',
  },
];

export const databaseTables = [
  "users: id, name, email, password",
  "skills: id, name, description, category, level",
  "progress: id, user_id, skill_id, status",
];
