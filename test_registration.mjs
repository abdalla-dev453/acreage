/**
 * E2E Full User Journey:
 * 1. Mobile Home View & Sticky CTA visibility
 * 2. Navigation to /register & CTA hidden check
 * 3. User Registration form submission
 * 4. Verification of /thank-you page
 * 5. Navigation to /login
 * 6. User Login with the newly registered credentials
 * 7. Verification of authenticated landing / dashboard redirection
 *
 * @param {import('@playwright/test').Page} page - Playwright page context
 * @param {Object} [options] - Execution options
 * @param {string} [options.baseUrl] - Base application URL
 */
export default async function run(page, options = {}) {
  const baseUrl = (
    options.baseUrl ||
    (typeof process !== "undefined" && process.env?.BASE_URL) ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");

  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const testUser = {
    username: `farmer_${uniqueId}`,
    email: `farmer_${uniqueId}@example.com`,
    password: "SecurePass123!",
    location: "Eldoret",
  };

  // Configure mobile viewport (iPhone SE standard 375x667)
  await page.setViewportSize({ width: 375, height: 667 });

  // Pre-seed cookie consent so CookieBanner does not obstruct interactions
  if (page.addInitScript) {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("cookies-accepted", "true");
      } catch (_) {}
    });
  }

  // 1. Visit Home page
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

  // Locate Mobile CTA
  const ctaLocator = page
    .locator(
      '[data-testid="mobile-cta-button"], [data-testid="mobile-cta-banner"] a, aside[aria-label="Mobile promotional banner"] a, div.fixed.bottom-0 a:has-text("Get Started")',
    )
    .first();

  await ctaLocator.waitFor({ state: "visible", timeout: 8000 });
  const ctaVisibleOnHome = await ctaLocator.isVisible();
  if (!ctaVisibleOnHome) {
    throw new Error(
      "Assertion Failure: Mobile CTA should be visible on home page.",
    );
  }

  // 2. Click CTA to navigate to /register
  await Promise.all([
    page.waitForURL("**/register", { timeout: 10000 }),
    ctaLocator.click(),
  ]);

  // 3. Verify CTA is hidden on /register
  await ctaLocator.waitFor({ state: "hidden", timeout: 5000 });
  const ctaVisibleOnRegister = await ctaLocator.isVisible();
  if (ctaVisibleOnRegister) {
    throw new Error(
      "Assertion Failure: Mobile CTA must be hidden on /register.",
    );
  }

  // 4. Fill Registration Form
  const usernameInput = page
    .locator(
      '[data-testid="register-username-input"], input#register-username, input[placeholder="e.g. john_doe"]',
    )
    .first();
  const emailInput = page
    .locator(
      '[data-testid="register-email-input"], input#register-email, input[type="email"]',
    )
    .first();
  const passwordInput = page
    .locator(
      '[data-testid="register-password-input"], input#register-password, input[type="password"]',
    )
    .first();
  const locationInput = page
    .locator(
      '[data-testid="register-location-input"], input#register-location, input[placeholder="e.g. Nakuru, Nairobi"]',
    )
    .first();
  const registerSubmitBtn = page
    .locator('[data-testid="register-submit-button"], button[type="submit"]')
    .first();

  await usernameInput.waitFor({ state: "visible", timeout: 8000 });
  await usernameInput.fill(testUser.username);
  await emailInput.fill(testUser.email);
  await passwordInput.fill(testUser.password);
  await locationInput.fill(testUser.location);

  // Monitor the registration API response
  const registerResponsePromise = page
    .waitForResponse(
      (resp) =>
        resp.url().includes("/api/auth/register") &&
        resp.request().method() === "POST",
      { timeout: 15000 },
    )
    .catch(() => null);

  await registerSubmitBtn.click();

  const registerResponse = await registerResponsePromise;
  if (registerResponse && !registerResponse.ok()) {
    const errorText = await registerResponse
      .text()
      .catch(() => "Unknown error");
    throw new Error(
      `Registration API request failed with status ${registerResponse.status()}: ${errorText}`,
    );
  }

  // 5. Verify /thank-you page transition & heading
  // Also check if any UI error message was displayed on /register
  const uiError = await page
    .locator('[data-testid="register-error"]')
    .innerText()
    .catch(() => null);
  if (uiError) {
    throw new Error(`Registration failed in UI with error: "${uiError}"`);
  }

  await page.waitForURL("**/thank-you", { timeout: 15000 });

  const headingLocator = page
    .locator('[data-testid="thank-you-heading"], h1')
    .first();
  await headingLocator.waitFor({ state: "visible", timeout: 8000 });

  const heading = (await headingLocator.innerText()).trim();
  const registrationSucceeded = heading === "Registration complete";
  if (!registrationSucceeded) {
    throw new Error(
      `Assertion Failure: Expected heading "Registration complete" but received "${heading}".`,
    );
  }

  // CTA must remain hidden on /thank-you
  await ctaLocator.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
  const ctaVisibleOnThankYou = await ctaLocator.isVisible();
  if (ctaVisibleOnThankYou) {
    throw new Error(
      "Assertion Failure: Mobile CTA must remain hidden on /thank-you.",
    );
  }

  // 6. Navigate from /thank-you to /login via the Sign In button
  // Scope specifically to the status-page CTA button so it does not match the hidden desktop nav link
  const signInLink = page
    .locator(
      '[data-testid="thank-you-signin-btn"], [data-testid="thank-you-container"] a.status-cta, main.status-page a[href="/login"]',
    )
    .first();
  await signInLink.waitFor({ state: "visible", timeout: 8000 });

  await Promise.all([
    page.waitForURL("**/login", { timeout: 10000 }),
    signInLink.click(),
  ]);

  // 7. Perform Login with the created account
  const loginEmailInput = page
    .locator(
      '[data-testid="login-email-input"], form[data-testid="login-form"] input[type="email"], input#login-email',
    )
    .first();
  const loginPasswordInput = page
    .locator(
      '[data-testid="login-password-input"], form[data-testid="login-form"] input[type="password"], input#login-password',
    )
    .first();
  const loginSubmitBtn = page
    .locator(
      '[data-testid="login-submit-button"], form[data-testid="login-form"] button[type="submit"]',
    )
    .first();

  await loginEmailInput.waitFor({ state: "visible", timeout: 8000 });
  await loginEmailInput.fill(testUser.email);
  await loginPasswordInput.fill(testUser.password);

  // Monitor the login API response
  const loginResponsePromise = page
    .waitForResponse(
      (resp) =>
        resp.url().includes("/api/auth/login") &&
        resp.request().method() === "POST",
      { timeout: 10000 },
    )
    .catch(() => null);

  await loginSubmitBtn.click();

  const loginResponse = await loginResponsePromise;
  if (loginResponse && !loginResponse.ok()) {
    const errorText = await loginResponse.text().catch(() => "Unknown error");
    throw new Error(
      `Login API request failed with status ${loginResponse.status()}: ${errorText}`,
    );
  }

  // 8. Confirm redirect to /dashboard and authenticated state
  await page.waitForURL("**/dashboard", { timeout: 12000 });
  const currentUrl = page.url();
  const loginSucceeded = currentUrl.includes("/dashboard");

  if (!loginSucceeded) {
    throw new Error(
      `Assertion Failure: Expected redirect to /dashboard but reached "${currentUrl}".`,
    );
  }

  return {
    ctaVisibleOnHome,
    ctaVisibleOnRegister,
    heading,
    ctaVisibleOnThankYou,
    registrationSucceeded,
    loginSucceeded,
    registeredUsername: testUser.username,
    userEmail: testUser.email,
  };
}
