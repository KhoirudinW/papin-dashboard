async (page) => {
  const baseUrl = "http://127.0.0.1:3000";
  const results = [];

  const push = (id, status, detail) => {
    results.push({ id, status, detail });
  };

  const clearStorage = async () => {
    await page.goto(`${baseUrl}/login`);
    await page.evaluate(() => {
      localStorage.removeItem("papin_session");
      localStorage.removeItem("papin_active_profile_id");
      sessionStorage.clear();
    });
  };

  const safeTextVisible = async (text, exact = false) => {
    try {
      return await page.getByText(text, { exact }).first().isVisible();
    } catch {
      return false;
    }
  };

  const safeRoleVisible = async (role, name) => {
    try {
      return await page.getByRole(role, { name }).isVisible();
    } catch {
      return false;
    }
  };

  try {
    await clearStorage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/login`);
    const hasHeading = await safeRoleVisible("heading", "Login");
    const hasIdentifier = await page.getByPlaceholder("contoh@email.com atau username").isVisible();
    const hasSubmit = await safeRoleVisible("button", "Masuk Ke Dashboard");
    const hasTabs =
      (await safeRoleVisible("link", "LOGIN")) && (await safeRoleVisible("link", "REGISTER"));
    push(
      "UIUX-001",
      hasHeading && hasIdentifier && hasSubmit && hasTabs ? "PASS" : "FAIL",
      "Render desktop login page",
    );
  } catch (err) {
    push("UIUX-001", "FAIL", String(err));
  }

  try {
    await clearStorage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/login`);
    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
    push(
      "UIUX-002",
      overflow <= 0 ? "PASS" : "FAIL",
      `horizontal overflow delta=${overflow}`,
    );
  } catch (err) {
    push("UIUX-002", "FAIL", String(err));
  }

  try {
    await clearStorage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${baseUrl}/login`);
    await page.getByRole("button", { name: "With passwords" }).click();
    const labelOk = await safeTextVisible("Password", true);
    const placeholderOk = await page.getByPlaceholder("Masukkan password").isVisible();
    push(
      "UIUX-003",
      labelOk && placeholderOk ? "PASS" : "FAIL",
      "Switch pair code -> password",
    );
  } catch (err) {
    push("UIUX-003", "FAIL", String(err));
  }

  try {
    await page.getByRole("button", { name: "With pair code" }).click();
    const labelOk = await safeTextVisible("Pair Code", true);
    push("UIUX-004", labelOk ? "PASS" : "FAIL", "Switch password -> pair code");
  } catch (err) {
    push("UIUX-004", "FAIL", String(err));
  }

  try {
    const pairCodeInput = page.getByPlaceholder("Masukkan pair code");
    await pairCodeInput.fill("ab12cd");
    const val = await pairCodeInput.inputValue();
    push("UIUX-005", val === "AB12CD" ? "PASS" : "FAIL", `pair code value=${val}`);
  } catch (err) {
    push("UIUX-005", "FAIL", String(err));
  }

  try {
    await page.getByRole("button", { name: "With passwords" }).click();
    const pwdInput = page.getByPlaceholder("Masukkan password");
    const eyeBtn = page.locator("div.relative.group button").first();

    const typeBefore = await pwdInput.getAttribute("type");
    await eyeBtn.click();
    const typeAfterFirst = await pwdInput.getAttribute("type");
    await eyeBtn.click();
    const typeAfterSecond = await pwdInput.getAttribute("type");

    const ok =
      typeBefore === "password" && typeAfterFirst === "text" && typeAfterSecond === "password";
    push(
      "UIUX-006",
      ok ? "PASS" : "FAIL",
      `types=${typeBefore}->${typeAfterFirst}->${typeAfterSecond}`,
    );
  } catch (err) {
    push("UIUX-006", "FAIL", String(err));
  }

  try {
    await clearStorage();
    await page.goto(`${baseUrl}/login`);
    await page.getByPlaceholder("contoh@email.com atau username").fill("random-user");
    const dialogPromise = page
      .waitForEvent("dialog", { timeout: 5000 })
      .then(async (dialog) => {
        const msg = dialog.message();
        await dialog.dismiss();
        return msg;
      })
      .catch(() => "");
    await page.getByRole("button", { name: "Masuk Ke Dashboard" }).click();
    const msg = await dialogPromise;
    const ok = msg.toLowerCase().includes("pair code wajib diisi");
    push("UIUX-007", ok ? "PASS" : "FAIL", msg || "dialog not captured");
  } catch (err) {
    push("UIUX-007", "FAIL", String(err));
  }

  try {
    await clearStorage();
    await page.goto(`${baseUrl}/login`);
    await page.getByRole("button", { name: "With passwords" }).click();
    await page.getByPlaceholder("contoh@email.com atau username").fill("nobody@example.com");
    await page.getByPlaceholder("Masukkan password").fill("123456");

    let sawLoading = false;
    const dialogPromise = page
      .waitForEvent("dialog", { timeout: 10000 })
      .then(async (dialog) => {
        const msg = dialog.message();
        await dialog.dismiss();
        return msg;
      })
      .catch(() => "");

    await page.getByRole("button", { name: "Masuk Ke Dashboard" }).click();

    for (let i = 0; i < 25; i += 1) {
      const btnText = await page.getByRole("button").filter({ hasText: /Authenticating|Masuk Ke Dashboard/ }).first().textContent();
      if (String(btnText || "").includes("Authenticating")) {
        sawLoading = true;
        break;
      }
      await page.waitForTimeout(80);
    }

    await dialogPromise;
    await page.waitForTimeout(150);
    const backNormal = await safeRoleVisible("button", "Masuk Ke Dashboard");
    push(
      "UIUX-008",
      sawLoading && backNormal ? "PASS" : "FAIL",
      `sawLoading=${sawLoading}, backNormal=${backNormal}`,
    );
  } catch (err) {
    push("UIUX-008", "FAIL", String(err));
  }

  try {
    await clearStorage();
    await page.goto(`${baseUrl}/login`);
    await page.getByRole("link", { name: "REGISTER" }).click();
    await page.waitForURL("**/register");
    const isRegister = page.url().endsWith("/register");
    const headingOk = await safeRoleVisible("heading", "Register");
    push(
      "UIUX-009",
      isRegister && headingOk ? "PASS" : "FAIL",
      `url=${page.url()}`,
    );
  } catch (err) {
    push("UIUX-009", "FAIL", String(err));
  }

  try {
    await clearStorage();
    await page.goto(`${baseUrl}/register`);
    const badge = await safeTextVisible("Belum Buat Akun");
    const btnCreate = await safeRoleVisible("button", "Buat Akun");
    const btnVerify = await safeRoleVisible("button", "Saya Sudah Verifikasi");
    push(
      "UIUX-010",
      badge && btnCreate && btnVerify ? "PASS" : "FAIL",
      "Register stage 1 default",
    );
  } catch (err) {
    push("UIUX-010", "FAIL", String(err));
  }

  push(
    "UIUX-011",
    "BLOCKED",
    "Butuh mock createAuthAccount success agar deterministic dan tidak membuat akun real.",
  );

  try {
    await clearStorage();
    await page.goto(`${baseUrl}/register`);
    const dialogPromise = page
      .waitForEvent("dialog", { timeout: 5000 })
      .then(async (dialog) => {
        const msg = dialog.message();
        await dialog.dismiss();
        return msg;
      })
      .catch(() => "");
    await page.getByRole("button", { name: "Saya Sudah Verifikasi" }).click();
    const msg = await dialogPromise;
    const stage2Visible = await safeTextVisible("Tahap 2 - Setup Profile");
    const ok = msg.toLowerCase().includes("format email tidak valid") && !stage2Visible;
    push("UIUX-012", ok ? "PASS" : "FAIL", `alert=${msg || "none"}, stage2=${stage2Visible}`);
  } catch (err) {
    push("UIUX-012", "FAIL", String(err));
  }

  push("UIUX-013", "BLOCKED", "Butuh state authStage=verified (mock/login real terverifikasi).");
  push("UIUX-014", "BLOCKED", "Bergantung pada UIUX-013 (Tahap 2 harus visible).");
  push("UIUX-015", "BLOCKED", "Bergantung pada UIUX-013 (Tahap 2 harus visible).");
  push("UIUX-016", "BLOCKED", "Bergantung pada UIUX-013 (Tahap 2 harus visible).");
  push("UIUX-017", "BLOCKED", "Bergantung pada UIUX-013 (Tahap 2 harus visible).");

  try {
    await clearStorage();
    await page.goto(`${baseUrl}/login`);
    await page.evaluate(() => {
      localStorage.setItem("papin_session", "{\"timestamp\":1,\"data\":{\"me\":{\"id\":\"dummy\"}}}");
    });
    await page.goto(`${baseUrl}/login`);
    await page.waitForURL("**/dashboard", { timeout: 7000 });
    const ok = page.url().endsWith("/dashboard");
    push("UIUX-018", ok ? "PASS" : "FAIL", `url=${page.url()}`);
  } catch (err) {
    push("UIUX-018", "FAIL", String(err));
  }

  return {
    generated_at: new Date().toISOString(),
    scope: ["login", "register"],
    summary: {
      total: results.length,
      pass: results.filter((r) => r.status === "PASS").length,
      fail: results.filter((r) => r.status === "FAIL").length,
      blocked: results.filter((r) => r.status === "BLOCKED").length,
    },
    results,
  };
}
