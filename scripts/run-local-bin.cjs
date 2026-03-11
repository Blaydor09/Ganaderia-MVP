const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const normalizeWindowsExtendedPath = (value) => value.replace(/^\\\\\?\\/, "");

const originalCwd = process.cwd();
const normalizedCwd = normalizeWindowsExtendedPath(originalCwd);

if (normalizedCwd !== originalCwd) {
  process.chdir(normalizedCwd);
}

const [, , executable, ...args] = process.argv;

if (!executable) {
  console.error("Usage: node scripts/run-local-bin.cjs <executable> [...args]");
  process.exit(1);
}

const resolveExecutable = (name) => {
  if (name === "node") {
    return process.execPath;
  }

  const binDir = path.join(process.cwd(), "node_modules", ".bin");
  const candidates =
    process.platform === "win32"
      ? [`${name}.cmd`, `${name}.exe`, name]
      : [name, `${name}.js`];

  for (const candidate of candidates) {
    const candidatePath = path.join(binDir, candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return name;
};

const resolvedExecutable = resolveExecutable(executable);
const quoteForCmd = (value) => {
  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
};

const child =
  process.platform === "win32" && /\.cmd$/i.test(resolvedExecutable)
    ? spawn(
        process.env.ComSpec || "cmd.exe",
        [
          "/d",
          "/s",
          "/c",
          [quoteForCmd(resolvedExecutable), ...args.map(quoteForCmd)].join(" "),
        ],
        {
          stdio: "inherit",
          cwd: process.cwd(),
          env: process.env,
          shell: false,
        }
      )
    : spawn(resolvedExecutable, args, {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
        shell: false,
      });

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
