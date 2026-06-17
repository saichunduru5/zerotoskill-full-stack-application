CREATE DATABASE IF NOT EXISTS zerotoskill;
USE zerotoskill;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  level VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_id VARCHAR(40) NOT NULL,
  status ENUM('in-progress', 'completed') NOT NULL DEFAULT 'completed',
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_skill (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

INSERT IGNORE INTO skills (id, name, description, category, level) VALUES
('html', 'HTML', 'Understand page structure, semantics, and accessibility basics.', 'Foundations', 'Beginner'),
('css', 'CSS', 'Style layouts, control spacing, and make pages responsive.', 'Foundations', 'Beginner'),
('javascript', 'JavaScript', 'Learn programming logic, DOM updates, and async basics.', 'Foundations', 'Beginner to Intermediate'),
('git-github', 'Git & GitHub', 'Track changes, collaborate, and publish projects professionally.', 'Workflow', 'Beginner'),
('react', 'React', 'Build component-based user interfaces and manage state.', 'Frontend', 'Intermediate'),
('backend', 'Backend', 'Design APIs, validate input, and protect data.', 'Full Stack', 'Intermediate'),
('mysql', 'MySQL', 'Store users, skills, and progress in a relational database.', 'Database', 'Intermediate'),
('projects', 'Projects', 'Ship proof of skill that helps you become job ready.', 'Portfolio', 'Project Phase');
