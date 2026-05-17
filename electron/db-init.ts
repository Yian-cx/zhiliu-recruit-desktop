import path from "path";
import fs from "fs";
import { execSync } from "child_process";

function ensureDefaultConfig(dbPath: string): void {
  // Ensure the AiConfig default record exists (needed for AI features)
  try {
    execSync(
      `sqlite3 "${dbPath}" "INSERT OR IGNORE INTO AiConfig (id, apiKey, baseUrl, modelName) VALUES ('default', '', 'https://api.deepseek.com', 'deepseek-chat');"`,
      { stdio: "pipe" }
    );
  } catch {
    // Table might not exist yet — that's ok, seed/template handles fresh DBs
  }
}

export async function initDatabase(
  userDataPath: string,
  appDir: string
): Promise<void> {
  const dbPath = path.join(userDataPath, "zhiliu.db");

  if (fs.existsSync(dbPath)) {
    console.log(`Database exists at ${dbPath}`);
    ensureDefaultConfig(dbPath);
    return;
  }

  const templatePath = path.join(appDir, "standalone", "template.db");
  if (!fs.existsSync(templatePath)) {
    console.error("Template database not found, skipping init.");
    return;
  }

  console.log(`Initializing database from template: ${templatePath} -> ${dbPath}`);
  fs.copyFileSync(templatePath, dbPath);

  const uploadDir = path.join(userDataPath, "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}
