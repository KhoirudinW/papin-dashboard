/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..", "..");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const session = `uiux-${Date.now()}`;
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const dotenvPath = path.resolve(rootDir, ".env");

if (fs.existsSync(dotenvPath)) {
  const dotenvRaw = fs.readFileSync(dotenvPath, "utf8");
  for (const line of dotenvRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const TEST_AUTH = {
  invalidIdentifier: process.env.UIUX_INVALID_IDENTIFIER || "dummy-user",
  invalidEmail: process.env.UIUX_INVALID_EMAIL || "uiux.invalid@example.invalid",
  invalidPassword: process.env.UIUX_INVALID_PASSWORD || "WrongPass123!",
  verifiedEmail: process.env.UIUX_TEST_EMAIL || "",
  verifiedPassword: process.env.UIUX_TEST_PASSWORD || "",
};

const results = [];

const runPw = (args) => {
  const cmdArgs = ["exec", "--yes", "--package", "@playwright/cli", "--", "playwright-cli", "-s", session, ...args]
    .map((arg) => JSON.stringify(arg))
    .join(" ");
  const cmd = `${npmCmd} ${cmdArgs}`;
  try {
    return execSync(cmd, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
  } catch (err) {
    const out = `${err.stdout || ""}\n${err.stderr || ""}`.trim();
    throw new Error(out || err.message);
  }
};

const runCode = (code) => {
  const compactCode = String(code).replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ").trim();
  const b64 = Buffer.from(compactCode, "utf8").toString("base64");
  const runner = `async (page) => { const b='${b64}'; const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let out=''; let buf=0; let bits=0; for (const ch of b) { if (ch === '=') break; const val = chars.indexOf(ch); if (val < 0) continue; buf = (buf << 6) | val; bits += 6; if (bits >= 8) { bits -= 8; out += String.fromCharCode((buf >> bits) & 255); } } const fn = eval('(' + out + ')'); return await fn(page); }`;
  const out = runPw(["run-code", runner]);
  if (out.includes("### Error")) {
    throw new Error(out.trim());
  }
  const match = out.match(/### Result\s*([\s\S]*?)\s*### Ran Playwright code/);
  if (!match) {
    throw new Error(`Unable to parse run-code output:\n${out}`);
  }
  const raw = match[1].trim();
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const add = (id, status, detail) => {
  results.push({ id, status, detail: String(detail || "") });
};

const execCase = (id, code, map = (r) => (r && r.ok ? "PASS" : "FAIL")) => {
  try {
    try {
      runPw(["dialog-dismiss"]);
    } catch {
      // no-op
    }
    const r = runCode(code);
    add(id, map(r), r.detail || JSON.stringify(r));
  } catch (err) {
    add(id, "FAIL", err.message);
  }
};

runPw(["open", "http://127.0.0.1:3000/login"]);

execCase(
  "UIUX-001",
  `async (page) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://127.0.0.1:3000/login");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    const heading = await page.getByRole("heading", { name: "Login" }).isVisible();
    const identifier = await page.getByPlaceholder("contoh@email.com atau username").isVisible();
    const submit = await page.getByRole("button", { name: "Masuk Ke Dashboard" }).isVisible();
    const tabs = await page.getByRole("link", { name: "LOGIN" }).isVisible() && await page.getByRole("link", { name: "REGISTER" }).isVisible();
    return { ok: heading && identifier && submit && tabs, detail: "Render desktop login page" };
  }`,
);

execCase(
  "UIUX-002",
  `async (page) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://127.0.0.1:3000/login");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    const delta = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
    return { ok: delta <= 0, detail: "horizontal overflow delta=" + delta };
  }`,
);

execCase(
  "UIUX-003",
  `async (page) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("http://127.0.0.1:3000/login");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.getByRole("button", { name: "With passwords" }).click();
    const label = await page.getByText("Password", { exact: true }).isVisible();
    const input = await page.getByPlaceholder("Masukkan password").isVisible();
    return { ok: label && input, detail: "Switch pair code -> password" };
  }`,
);

execCase(
  "UIUX-004",
  `async (page) => {
    await page.getByRole("button", { name: "With pair code" }).click();
    const label = await page.getByText("Pair Code", { exact: true }).isVisible();
    return { ok: label, detail: "Switch password -> pair code" };
  }`,
);

execCase(
  "UIUX-005",
  `async (page) => {
    const input = page.getByPlaceholder("Masukkan pair code");
    await input.fill("ab12cd");
    const value = await input.inputValue();
    return { ok: value === "AB12CD", detail: "value=" + value };
  }`,
);

execCase(
  "UIUX-006",
  `async (page) => {
    await page.getByRole("button", { name: "With passwords" }).click();
    const input = page.getByPlaceholder("Masukkan password");
    const eye = page.locator("div.relative.group button").first();
    const t1 = await input.getAttribute("type");
    await eye.click();
    const t2 = await input.getAttribute("type");
    await eye.click();
    const t3 = await input.getAttribute("type");
    return { ok: t1 === "password" && t2 === "text" && t3 === "password", detail: t1 + "->" + t2 + "->" + t3 };
  }`,
);

execCase(
  "UIUX-007",
  `async (page) => {
    await page.goto("http://127.0.0.1:3000/login");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.evaluate(() => {
      window.__lastAlert = "";
      window.alert = (msg) => { window.__lastAlert = String(msg || ""); };
    });
    await page.getByPlaceholder("contoh@email.com atau username").fill(${JSON.stringify(TEST_AUTH.invalidIdentifier)});
    await page.getByRole("button", { name: "Masuk Ke Dashboard" }).click();
    const msg = await page.evaluate(() => window.__lastAlert || "");
    return { ok: msg.toLowerCase().includes("pair code wajib diisi"), detail: msg || "dialog not captured" };
  }`,
);

execCase(
  "UIUX-008",
  `async (page) => {
    await page.goto("http://127.0.0.1:3000/login");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.evaluate(() => {
      window.__lastAlert = "";
      window.alert = (msg) => { window.__lastAlert = String(msg || ""); };
    });
    await page.getByRole("button", { name: "With passwords" }).click();
    await page.getByPlaceholder("contoh@email.com atau username").fill(${JSON.stringify(TEST_AUTH.invalidEmail)});
    await page.getByPlaceholder("Masukkan password").fill(${JSON.stringify(TEST_AUTH.invalidPassword)});

    await page.getByRole("button", { name: "Masuk Ke Dashboard" }).click();

    let sawLoading = false;
    let backNormal = false;
    let msg = "";
    for (let i = 0; i < 25; i += 1) {
      const txt = await page.getByRole("button").filter({ hasText: /Authenticating|Masuk Ke Dashboard/ }).first().textContent();
      if (String(txt || "").includes("Authenticating")) {
        sawLoading = true;
      }
      backNormal = await page.getByRole("button", { name: "Masuk Ke Dashboard" }).isVisible().catch(() => false);
      msg = await page.evaluate(() => window.__lastAlert || "");
      if (backNormal && msg.length > 0) break;
      await page.waitForTimeout(80);
    }

    return { ok: sawLoading && backNormal && msg.length > 0, detail: "sawLoading=" + sawLoading + ", backNormal=" + backNormal + ", alert=" + msg };
  }`,
);

execCase(
  "UIUX-009",
  `async (page) => {
    await page.goto("http://127.0.0.1:3000/login");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.getByRole("link", { name: "REGISTER" }).click();
    await page.waitForURL("**/register");
    const ok = page.url().endsWith("/register") && await page.getByRole("heading", { name: "Register" }).isVisible();
    return { ok, detail: page.url() };
  }`,
);

execCase(
  "UIUX-010",
  `async (page) => {
    await page.goto("http://127.0.0.1:3000/register");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    const badge = await page.getByText("Belum Buat Akun").isVisible();
    const a = await page.getByRole("button", { name: "Buat Akun" }).isVisible();
    const b = await page.getByRole("button", { name: "Saya Sudah Verifikasi" }).isVisible();
    return { ok: badge && a && b, detail: "Register stage 1 default" };
  }`,
);

execCase(
  "UIUX-011",
  `async (page) => {
    await page.goto("http://127.0.0.1:3000/register");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.route("**/auth/v1/signup**", async (route) => {
      const req = route.request();
      if (req.method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "00000000-0000-0000-0000-000000000011",
            email: "mock-uiux-011@test.local",
            email_confirmed_at: null,
          },
          session: null,
        }),
      });
    });

    await page.evaluate(() => {
      window.__lastAlert = "";
      window.alert = (msg) => { window.__lastAlert = String(msg || ""); };
    });

    await page.getByPlaceholder("email untuk login akun").fill("mock-uiux-011@test.local");
    await page.getByPlaceholder("minimal 6 karakter").fill("Mock1234");
    await page.getByRole("button", { name: "Buat Akun" }).click();
    let msg = "";
    for (let i = 0; i < 20; i += 1) {
      msg = await page.evaluate(() => window.__lastAlert || "");
      if (msg) break;
      await page.waitForTimeout(150);
    }
    const ok = msg.toLowerCase().includes("akun berhasil dibuat");
    await page.unroute("**/auth/v1/signup**");
    return { ok, detail: msg || "alert not captured" };
  }`,
);

execCase(
  "UIUX-012",
  `async (page) => {
    await page.goto("http://127.0.0.1:3000/register");
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.evaluate(() => {
      window.__lastAlert = "";
      window.alert = (msg) => { window.__lastAlert = String(msg || ""); };
    });
    await page.getByRole("button", { name: "Saya Sudah Verifikasi" }).click();
    const msg = await page.evaluate(() => window.__lastAlert || "");
    const stage2 = await page.getByText("Tahap 2 - Setup Profile").isVisible().catch(() => false);
    return { ok: msg.toLowerCase().includes("format email tidak valid") && !stage2, detail: "alert=" + msg + ", stage2=" + stage2 };
  }`,
);

if (!TEST_AUTH.verifiedEmail || !TEST_AUTH.verifiedPassword) {
  add("UIUX-013", "BLOCKED", "Butuh UIUX_TEST_EMAIL dan UIUX_TEST_PASSWORD untuk login verified.");
  add("UIUX-014", "BLOCKED", "Bergantung pada UIUX-013.");
  add("UIUX-015", "BLOCKED", "Bergantung pada UIUX-013.");
  add("UIUX-016", "BLOCKED", "Bergantung pada UIUX-013.");
  add("UIUX-017", "BLOCKED", "Bergantung pada UIUX-013.");
} else {
  let stage2Ready = false;
  try {
    const result013 = runCode(
      `async (page) => {
        await page.goto("http://127.0.0.1:3000/login");
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.reload();
        await page.getByRole("button", { name: "With passwords" }).click();
        await page.getByPlaceholder("contoh@email.com atau username").fill(${JSON.stringify(TEST_AUTH.verifiedEmail)});
        await page.getByPlaceholder("Masukkan password").fill(${JSON.stringify(TEST_AUTH.verifiedPassword)});
        await page.getByRole("button", { name: "Masuk Ke Dashboard" }).click();
        await page.waitForURL("**/dashboard", { timeout: 12000 });
        await page.goto("http://127.0.0.1:3000/register");
        const stage2 = await page.getByText("Tahap 2 - Setup Profile").isVisible().catch(() => false);
        return { ok: stage2, detail: "stage2 visible=" + stage2 };
      }`,
    );
    stage2Ready = Boolean(result013 && result013.ok);
    if (stage2Ready) {
      add("UIUX-013", "PASS", result013.detail || "stage2 visible=true");
    } else {
      add("UIUX-013", "BLOCKED", "Login valid tetapi tahap 2 tidak muncul (akun belum verified atau sesi tidak cocok).");
    }
  } catch (err) {
    add("UIUX-013", "FAIL", err.message);
  }

  if (!stage2Ready) {
    add("UIUX-014", "BLOCKED", "Bergantung pada UIUX-013.");
    add("UIUX-015", "BLOCKED", "Bergantung pada UIUX-013.");
    add("UIUX-016", "BLOCKED", "Bergantung pada UIUX-013.");
    add("UIUX-017", "BLOCKED", "Bergantung pada UIUX-013.");
  } else {
    execCase(
      "UIUX-014",
      `async (page) => {
        await page.goto("http://127.0.0.1:3000/register");
        const modeButtons = page.locator("button.p-4.rounded-2xl.border");
        await modeButtons.nth(0).click();
        const pairCta = await page.getByRole("button", { name: "Lanjut ke Data Pasangan" }).isVisible().catch(() => false);
        await modeButtons.nth(1).click();
        const soloCta = await page.getByRole("button", { name: "Daftar Sekarang" }).isVisible().catch(() => false);
        return { ok: pairCta && soloCta, detail: "pairCta=" + pairCta + ", soloCta=" + soloCta };
      }`,
    );

    execCase(
      "UIUX-015",
      `async (page) => {
        await page.goto("http://127.0.0.1:3000/register");
        const modeButtons = page.locator("button.p-4.rounded-2xl.border");
        await modeButtons.nth(0).click();
        const allSelect = page.locator("select");
        await allSelect.first().selectOption("A");
        await page.getByRole("button", { name: "Lanjut ke Data Pasangan" }).click();
        const readonlyGender = page.locator("input[readOnly]").first();
        const val = await readonlyGender.inputValue();
        return { ok: val.toLowerCase().includes("perempuan"), detail: "partnerGender=" + val };
      }`,
    );

    execCase(
      "UIUX-016",
      `async (page) => {
        await page.goto("http://127.0.0.1:3000/register");
        const modeButtons = page.locator("button.p-4.rounded-2xl.border");
        await modeButtons.nth(0).click();
        const allSelect = page.locator("select");
        await allSelect.first().selectOption("A");
        await page.getByRole("button", { name: "Lanjut ke Data Pasangan" }).click();
        const submitBtn = page.getByRole("button", { name: "Daftar Berdua" });
        const disabledBefore = await submitBtn.isDisabled();
        await page.locator("input[type='checkbox']").first().check();
        const disabledAfter = await submitBtn.isDisabled();
        return { ok: disabledBefore && !disabledAfter, detail: "disabledBefore=" + disabledBefore + ", disabledAfter=" + disabledAfter };
      }`,
    );

    execCase(
      "UIUX-017",
      `async (page) => {
        await page.goto("http://127.0.0.1:3000/register");
        const modeButtons = page.locator("button.p-4.rounded-2xl.border");
        await modeButtons.nth(0).click();
        const allSelect = page.locator("select");
        await allSelect.first().selectOption("A");
        await page.getByRole("button", { name: "Lanjut ke Data Pasangan" }).click();
        await page.locator("label.group").first().hover();
        const tip = await page.getByText("Privacy Summary").isVisible().catch(() => false);
        return { ok: tip, detail: "tooltipVisible=" + tip };
      }`,
    );
  }
}

execCase(
  "UIUX-018",
  `async (page) => {
    await page.goto("http://127.0.0.1:3000/login");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("papin_session", "{\\"timestamp\\":1,\\"data\\":{\\"me\\":{\\"id\\":\\"dummy\\"}}}");
    });
    await page.reload();
    let redirected = false;
    for (let i = 0; i < 30; i += 1) {
      if (page.url().endsWith("/dashboard")) {
        redirected = true;
        break;
      }
      await page.waitForTimeout(500);
    }
    return { ok: redirected, detail: page.url() };
  }`,
);

runPw(["close"]);

const summary = {
  total: results.length,
  pass: results.filter((r) => r.status === "PASS").length,
  fail: results.filter((r) => r.status === "FAIL").length,
  blocked: results.filter((r) => r.status === "BLOCKED").length,
};

const resultJson = {
  generated_at: new Date().toISOString(),
  tool: "playwright-cli",
  source: "testing/testcase.md (UI/UX Automation Test Cases)",
  summary,
  results,
};

const outDir = path.resolve(rootDir, "testing", "results");
fs.mkdirSync(outDir, { recursive: true });

const outJson = path.resolve(outDir, `uiux-playwright-${timestamp}.json`);
const outMd = path.resolve(outDir, `uiux-playwright-${timestamp}.md`);

fs.writeFileSync(outJson, JSON.stringify(resultJson, null, 2), "utf8");

const mdRows = [
  "| ID | Status | Detail |",
  "|---|---|---|",
  ...results.map((r) => {
    const detail = String(r.detail).replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
    return `| ${r.id} | ${r.status} | ${detail} |`;
  }),
];

const md = [
  "# Hasil UI UX Test - Playwright CLI",
  "",
  `Tanggal: ${new Date().toISOString()}`,
  "Sumber: `testing/testcase.md` (bagian UI/UX)",
  "",
  "## Ringkasan",
  "",
  `- Total: **${summary.total}**`,
  `- PASS: **${summary.pass}**`,
  `- FAIL: **${summary.fail}**`,
  `- BLOCKED: **${summary.blocked}**`,
  "",
  "## Detail",
  "",
  ...mdRows,
].join("\n");

fs.writeFileSync(outMd, md, "utf8");

console.log("UI/UX Playwright run completed.");
console.log(`JSON: ${path.relative(rootDir, outJson)}`);
console.log(`MD  : ${path.relative(rootDir, outMd)}`);
console.log(
  `Summary: TOTAL=${summary.total} PASS=${summary.pass} FAIL=${summary.fail} BLOCKED=${summary.blocked}`,
);
