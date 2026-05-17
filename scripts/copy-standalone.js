const fs = require("fs");
const path = require("path");

function copyDir(src, dest, { skip = [] } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(srcPath);
      fs.symlinkSync(linkTarget, destPath);
    } else if (entry.isDirectory()) {
      copyDir(srcPath, destPath, { skip });
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const root = path.join(__dirname, "..");
  const standaloneDir = path.join(root, ".next", "standalone");

  copyDir(
    path.join(root, ".next", "static"),
    path.join(standaloneDir, ".next", "static")
  );

  copyDir(
    path.join(root, "public"),
    path.join(standaloneDir, "public")
  );

  const prismaDest = path.join(standaloneDir, "prisma");
  fs.mkdirSync(prismaDest, { recursive: true });
  fs.copyFileSync(
    path.join(root, "prisma", "schema.prisma"),
    path.join(prismaDest, "schema.prisma")
  );
  fs.copyFileSync(
    path.join(root, "prisma", "seed-desktop.cjs"),
    path.join(standaloneDir, "seed-desktop.cjs")
  );

  // Clean up files unnecessarily traced from project root
  const removeList = [
    "src",
    "electron",
    "scripts",
    "dist-electron",
    "resources",
    "release",
    ".next",
    "electron-builder.yml",
    "package-lock.json",
    "tsconfig.electron.json",
    ".gitignore",
    "AGENTS.md",
    "CLAUDE.md",
  ];
  for (const name of removeList) {
    const target = path.join(standaloneDir, name);
    if (fs.existsSync(target)) {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        rmDir(target);
      } else {
        fs.unlinkSync(target);
      }
    }
  }

  // Remove nested standalone directory if traced
  rmDir(path.join(standaloneDir, "standalone"));

  const destDir = path.join(root, "standalone");
  rmDir(destDir);
  fs.renameSync(standaloneDir, destDir);

  // Copy full .next build output so the production server can find it
  const dotNextSrc = path.join(root, ".next");
  const dotNextDest = path.join(destDir, ".next");
  copyDir(dotNextSrc, dotNextDest, { skip: ["standalone", "cache"] });

  console.log("Standalone build prepared for Electron packaging");
}

main();
