-- Table users pour l'authentification
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricule VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'UBD', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion de quelques utilisateurs par défaut (mot de passe = 'password123')
-- Hash généré pour 'password123'
INSERT IGNORE INTO users (matricule, email, password_hash, role) VALUES 
('M1001', 'admin@pharmacie-centrale.tn', '$2b$10$OebN8o1X809B93Wq9kL3y.iC5dF.3M.E/P4N4O6Hn2oI0fQG0U8Ym', 'ADMIN'),
('M1002', 'ubd@pharmacie-centrale.tn', '$2b$10$OebN8o1X809B93Wq9kL3y.iC5dF.3M.E/P4N4O6Hn2oI0fQG0U8Ym', 'UBD'),
('M1003', 'viewer@pharmacie-centrale.tn', '$2b$10$OebN8o1X809B93Wq9kL3y.iC5dF.3M.E/P4N4O6Hn2oI0fQG0U8Ym', 'VIEWER');
