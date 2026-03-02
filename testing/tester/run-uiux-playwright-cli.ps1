$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $rootDir

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$session = "uiux-$timestamp"

function Invoke-PW {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$ArgsList
  )

  $raw = & npx --yes --package @playwright/cli playwright-cli -s $session @ArgsList 2>&1
  return ($raw | Out-String)
}

function Invoke-RunCode {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Code
  )

  $normalizedCode = ($Code -replace "`r", " " -replace "`n", " ")
  $jsonEscapedCode = $normalizedCode | ConvertTo-Json -Compress
  $runner = "async (page) => { const src = $jsonEscapedCode; const fn = eval('(' + src + ')'); return await fn(page); }"
  $out = Invoke-PW -ArgsList @("run-code", $runner)
  if ($out -match "### Error") {
    throw "run-code returned error: $out"
  }

  $match = [regex]::Match($out, "(?s)### Result\s*(.*?)\s*### Ran Playwright code")
  if (-not $match.Success) {
    throw "Unable to parse run-code output: $out"
  }

  $rawResult = $match.Groups[1].Value.Trim()
  try {
    return ($rawResult | ConvertFrom-Json -Depth 20)
  } catch {
    return $rawResult
  }
}

$results = New-Object System.Collections.Generic.List[Object]
function Add-Result {
  param(
    [string]$Id,
    [string]$Status,
    [string]$Detail
  )
  $results.Add([pscustomobject]@{
      id     = $Id
      status = $Status
      detail = $Detail
    })
}

Invoke-PW -ArgsList @("open", "http://127.0.0.1:3000/login") | Out-Null

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  const heading = await page.getByRole("heading", { name: "Login" }).isVisible();
  const identifier = await page.getByPlaceholder("contoh@email.com atau username").isVisible();
  const submit = await page.getByRole("button", { name: "Masuk Ke Dashboard" }).isVisible();
  const tabs = await page.getByRole("link", { name: "LOGIN" }).isVisible() && await page.getByRole("link", { name: "REGISTER" }).isVisible();
  return { ok: heading && identifier && submit && tabs, detail: "Render desktop login page" };
}
'@
  Add-Result -Id "UIUX-001" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-001" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  const delta = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
  return { ok: delta <= 0, detail: `horizontal overflow delta=${delta}` };
}
'@
  Add-Result -Id "UIUX-002" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-002" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.getByRole("button", { name: "With passwords" }).click();
  const label = await page.getByText("Password", { exact: true }).isVisible();
  const input = await page.getByPlaceholder("Masukkan password").isVisible();
  return { ok: label && input, detail: "Switch pair code -> password" };
}
'@
  Add-Result -Id "UIUX-003" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-003" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.getByRole("button", { name: "With pair code" }).click();
  const label = await page.getByText("Pair Code", { exact: true }).isVisible();
  return { ok: label, detail: "Switch password -> pair code" };
}
'@
  Add-Result -Id "UIUX-004" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-004" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  const input = page.getByPlaceholder("Masukkan pair code");
  await input.fill("ab12cd");
  const value = await input.inputValue();
  return { ok: value === "AB12CD", detail: `value=${value}` };
}
'@
  Add-Result -Id "UIUX-005" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-005" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.getByRole("button", { name: "With passwords" }).click();
  const input = page.getByPlaceholder("Masukkan password");
  const eye = page.locator("div.relative.group button").first();
  const t1 = await input.getAttribute("type");
  await eye.click();
  const t2 = await input.getAttribute("type");
  await eye.click();
  const t3 = await input.getAttribute("type");
  return { ok: t1 === "password" && t2 === "text" && t3 === "password", detail: `${t1}->${t2}->${t3}` };
}
'@
  Add-Result -Id "UIUX-006" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-006" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.getByPlaceholder("contoh@email.com atau username").fill("dummy-user");
  const d = page.waitForEvent("dialog", { timeout: 5000 }).then(async (dialog) => {
    const message = dialog.message();
    await dialog.dismiss();
    return message;
  }).catch(() => "");
  await page.getByRole("button", { name: "Masuk Ke Dashboard" }).click();
  const msg = await d;
  return { ok: msg.toLowerCase().includes("pair code wajib diisi"), detail: msg || "dialog not captured" };
}
'@
  Add-Result -Id "UIUX-007" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-007" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.getByRole("button", { name: "With passwords" }).click();
  await page.getByPlaceholder("contoh@email.com atau username").fill("nobody@example.com");
  await page.getByPlaceholder("Masukkan password").fill("123456");

  const d = page.waitForEvent("dialog", { timeout: 10000 }).then(async (dialog) => {
    await dialog.dismiss();
    return true;
  }).catch(() => false);

  await page.getByRole("button", { name: "Masuk Ke Dashboard" }).click();

  let sawLoading = false;
  for (let i = 0; i < 25; i += 1) {
    const txt = await page.getByRole("button").filter({ hasText: /Authenticating|Masuk Ke Dashboard/ }).first().textContent();
    if (String(txt || "").includes("Authenticating")) {
      sawLoading = true;
      break;
    }
    await page.waitForTimeout(80);
  }

  await d;
  await page.waitForTimeout(150);
  const backNormal = await page.getByRole("button", { name: "Masuk Ke Dashboard" }).isVisible();
  return { ok: sawLoading && backNormal, detail: `sawLoading=${sawLoading}, backNormal=${backNormal}` };
}
'@
  Add-Result -Id "UIUX-008" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-008" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.getByRole("link", { name: "REGISTER" }).click();
  await page.waitForURL("**/register");
  const ok = page.url().endsWith("/register") && await page.getByRole("heading", { name: "Register" }).isVisible();
  return { ok, detail: page.url() };
}
'@
  Add-Result -Id "UIUX-009" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-009" -Status "FAIL" -Detail $_.Exception.Message
}

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.goto("http://127.0.0.1:3000/register");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  const badge = await page.getByText("Belum Buat Akun").isVisible();
  const a = await page.getByRole("button", { name: "Buat Akun" }).isVisible();
  const b = await page.getByRole("button", { name: "Saya Sudah Verifikasi" }).isVisible();
  return { ok: badge && a && b, detail: "Register stage 1 default" };
}
'@
  Add-Result -Id "UIUX-010" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-010" -Status "FAIL" -Detail $_.Exception.Message
}

Add-Result -Id "UIUX-011" -Status "BLOCKED" -Detail "Butuh mock success createAuthAccount agar deterministic tanpa membuat akun real."

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.goto("http://127.0.0.1:3000/register");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  const d = page.waitForEvent("dialog", { timeout: 5000 }).then(async (dialog) => {
    const message = dialog.message();
    await dialog.dismiss();
    return message;
  }).catch(() => "");
  await page.getByRole("button", { name: "Saya Sudah Verifikasi" }).click();
  const msg = await d;
  const stage2 = await page.getByText("Tahap 2 - Setup Profile").isVisible().catch(() => false);
  return { ok: msg.toLowerCase().includes("format email tidak valid") && !stage2, detail: `alert=${msg}, stage2=${stage2}` };
}
'@
  Add-Result -Id "UIUX-012" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-012" -Status "FAIL" -Detail $_.Exception.Message
}

Add-Result -Id "UIUX-013" -Status "BLOCKED" -Detail "Butuh state authStage=verified."
Add-Result -Id "UIUX-014" -Status "BLOCKED" -Detail "Bergantung pada UIUX-013."
Add-Result -Id "UIUX-015" -Status "BLOCKED" -Detail "Bergantung pada UIUX-013."
Add-Result -Id "UIUX-016" -Status "BLOCKED" -Detail "Bergantung pada UIUX-013."
Add-Result -Id "UIUX-017" -Status "BLOCKED" -Detail "Bergantung pada UIUX-013."

try {
  $r = Invoke-RunCode @'
async (page) => {
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => {
    localStorage.setItem("papin_session", "{\"timestamp\":1,\"data\":{\"me\":{\"id\":\"dummy\"}}}");
  });
  await page.goto("http://127.0.0.1:3000/login");
  await page.waitForURL("**/dashboard", { timeout: 7000 });
  return { ok: page.url().endsWith("/dashboard"), detail: page.url() };
}
'@
  Add-Result -Id "UIUX-018" -Status $(if ($r.ok) { "PASS" } else { "FAIL" }) -Detail $r.detail
} catch {
  Add-Result -Id "UIUX-018" -Status "FAIL" -Detail $_.Exception.Message
}

Invoke-PW -ArgsList @("close") | Out-Null

$total = $results.Count
$pass = ($results | Where-Object { $_.status -eq "PASS" }).Count
$fail = ($results | Where-Object { $_.status -eq "FAIL" }).Count
$blocked = ($results | Where-Object { $_.status -eq "BLOCKED" }).Count

$outJson = Join-Path $rootDir "testing\results\uiux-playwright-$timestamp.json"
$outMd = Join-Path $rootDir "testing\results\uiux-playwright-$timestamp.md"

$jsonObj = [pscustomobject]@{
  generated_at = (Get-Date).ToString("o")
  tool = "playwright-cli"
  source = "testing/testcase.md (UI/UX Automation Test Cases)"
  summary = [pscustomobject]@{
    total = $total
    pass = $pass
    fail = $fail
    blocked = $blocked
  }
  results = $results
}

$jsonObj | ConvertTo-Json -Depth 20 | Set-Content -Path $outJson -Encoding UTF8

$table = @()
$table += "| ID | Status | Detail |"
$table += "|---|---|---|"
foreach ($item in $results) {
  $detail = ($item.detail -replace "\r?\n", " " -replace "\|", "\|")
  $table += "| $($item.id) | $($item.status) | $detail |"
}

$md = @(
  "# Hasil UI UX Test - Playwright CLI"
  ""
  "Tanggal: $((Get-Date).ToString("o"))"
  "Sumber: `testing/testcase.md` (bagian UI/UX)"
  ""
  "## Ringkasan"
  ""
  "- Total: **$total**"
  "- PASS: **$pass**"
  "- FAIL: **$fail**"
  "- BLOCKED: **$blocked**"
  ""
  "## Detail"
  ""
  $table
) -join "`n"

$md | Set-Content -Path $outMd -Encoding UTF8

Write-Output "UI/UX Playwright run completed."
Write-Output "JSON: $outJson"
Write-Output "MD  : $outMd"
Write-Output "Summary: TOTAL=$total PASS=$pass FAIL=$fail BLOCKED=$blocked"
