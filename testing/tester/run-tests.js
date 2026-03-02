/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..", "..");
const defaultPlanPath = path.resolve(__dirname, "test-plan.json");
const planPath = process.argv[2]
  ? path.resolve(rootDir, process.argv[2])
  : defaultPlanPath;

const now = new Date();
const nowIso = now.toISOString();

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const toMdTable = (rows) => {
  const header = "| ID | Jenis | Deskripsi | Status | Detail |";
  const sep = "|---|---|---|---|---|";
  const body = rows.map((r) => {
    const detail = (r.detail || "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
    return `| ${r.id} | ${r.type} | ${r.description} | ${r.status} | ${detail} |`;
  });
  return [header, sep, ...body].join("\n");
};

const sanitizeAscii = (input) =>
  String(input || "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .trim();

const runCommand = (command) => {
  try {
    const output = execSync(command, {
      cwd: rootDir,
      stdio: "pipe",
      encoding: "utf8",
    });
    return { status: "PASS", detail: output.trim() || "Command executed successfully." };
  } catch (err) {
    const stdout = err.stdout ? String(err.stdout) : "";
    const stderr = err.stderr ? String(err.stderr) : "";
    const detail = `${stdout}\n${stderr}`.trim() || String(err.message || "Command failed.");
    return { status: "FAIL", detail };
  }
};

const runFileCheck = (targetPath) => {
  const absPath = path.resolve(rootDir, targetPath);
  if (fs.existsSync(absPath)) {
    return { status: "PASS", detail: `Found: ${targetPath}` };
  }
  return { status: "FAIL", detail: `Not found: ${targetPath}` };
};

const plan = readJson(planPath);
const rows = [];

for (const cmd of plan.automated.commands || []) {
  const res = runCommand(cmd.command);
  rows.push({
    id: cmd.id,
    type: "command",
    description: cmd.description,
    status: res.status,
    detail: res.detail.slice(0, 600),
  });
}

for (const check of plan.automated.file_checks || []) {
  const res = runFileCheck(check.path);
  rows.push({
    id: check.id,
    type: "file_check",
    description: check.description,
    status: res.status,
    detail: res.detail,
  });
}

const passed = rows.filter((r) => r.status === "PASS").length;
const failed = rows.filter((r) => r.status === "FAIL").length;
const normalizedRows = rows.map((r) => ({
  ...r,
  detail: sanitizeAscii(r.detail),
}));

const resultsDir = path.resolve(rootDir, "testing", "results");
fs.mkdirSync(resultsDir, { recursive: true });

const resultJsonPath = path.resolve(resultsDir, "percobaan1.json");
const resultMdPath = path.resolve(resultsDir, "percobaan1.md");

const resultJson = {
  generated_at: nowIso,
  plan: path.relative(rootDir, planPath).replace(/\\/g, "/"),
  source_testcase: plan.source_testcase,
  summary: {
    total: rows.length,
    passed,
    failed,
  },
  executed: normalizedRows,
  manual_reference: plan.manual_reference || null,
};

fs.writeFileSync(resultJsonPath, JSON.stringify(resultJson, null, 2), "utf8");

const fixes = [
  "Menambahkan infrastruktur testing: test-plan JSON, BAT runner, dan script runner Node.",
  "Menjalankan validasi otomatis (lint + file check) untuk flow register 2 tahap, login, pairing notifications, dan route setup profile.",
];

const mdContent = [
  "# Hasil Testing - Percobaan 1",
  "",
  `Tanggal: ${nowIso}`,
  `Sumber Test Case: \`${plan.source_testcase}\``,
  "",
  "## Test Apa yang Dijalankan",
  "",
  "- Automated command tests dari `testing/tester/test-plan.json`",
  "- Automated file existence checks dari `testing/tester/test-plan.json`",
  "- Manual test matrix referensi dari `testing/testcase.md` (belum dieksekusi otomatis)",
  "",
  "## Apa Saja yang Diperbaiki",
  "",
  ...fixes.map((f) => `- ${f}`),
  "",
  "## Hasil Test",
  "",
  `- Total eksekusi otomatis: **${rows.length}**`,
  `- Pass: **${passed}**`,
  `- Fail: **${failed}**`,
  "",
  toMdTable(normalizedRows),
  "",
  "## Catatan",
  "",
  "- Test case UI end-to-end (mis. verifikasi email via inbox, klik notifikasi di browser, pairing antar akun real) perlu dijalankan manual oleh tester QA sesuai `testing/testcase.md`.",
  "- Detail lengkap hasil eksekusi otomatis juga tersimpan di `testing/results/percobaan1.json`.",
  "",
].join("\n");

fs.writeFileSync(resultMdPath, mdContent, "utf8");

console.log(`Testing completed. PASS=${passed}, FAIL=${failed}`);
console.log(`Result JSON: ${path.relative(rootDir, resultJsonPath)}`);
console.log(`Result MD  : ${path.relative(rootDir, resultMdPath)}`);
