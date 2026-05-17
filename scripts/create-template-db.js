const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const tmpDir = path.join(root, ".template-db-tmp");
const outputPath = path.join(root, "standalone", "template.db");

// Clean any previous temp
if (fs.existsSync(tmpDir)) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
fs.mkdirSync(tmpDir, { recursive: true });

// Copy schema to temp dir
fs.copyFileSync(
  path.join(root, "prisma", "schema.prisma"),
  path.join(tmpDir, "schema.prisma")
);

// Copy seed to temp dir
fs.copyFileSync(
  path.join(root, "prisma", "seed-desktop.cjs"),
  path.join(tmpDir, "seed-desktop.cjs")
);

const dbPath = path.join(tmpDir, "template.db");
const env = {
  ...process.env,
  DATABASE_URL: `file:${dbPath}`,
};

console.log("Creating template database...");

// Run prisma db push
execSync("npx prisma db push --skip-generate", {
  cwd: tmpDir,
  env,
  stdio: "inherit",
  timeout: 60000,
});

console.log("Seeding template database...");

// Run seed
execSync("node seed-desktop.cjs", {
  cwd: tmpDir,
  env,
  stdio: "inherit",
  timeout: 30000,
});

// Copy template DB to standalone
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}
fs.copyFileSync(dbPath, outputPath);
console.log(`Template database created at ${outputPath}`);

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });
