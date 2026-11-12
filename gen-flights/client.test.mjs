import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  apiOrigin,
  buildStartURL,
  canonicalReturnTo,
  challengeFromVerifier,
  classifyAuthFailure,
  classifyGenerationFailure,
  invalidInputMessage,
  isSafeAPIBase,
  parseHandoffFragment,
  accountFromSession,
  showsFlightWorkspace,
  viewModel,
} from "./client.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("api base accepts only https and loopback http", () => {
  assert.equal(isSafeAPIBase(""), false);
  assert.equal(isSafeAPIBase("javascript:alert(1)"), false);
  assert.equal(isSafeAPIBase("https://user:pass@api.example"), false);
  assert.equal(isSafeAPIBase("http://evil.example"), false);
  assert.equal(apiOrigin("https://api.example/ignored/path"), "https://api.example");
  assert.equal(apiOrigin("http://127.0.0.1:3000/nope"), "http://127.0.0.1:3000");
  assert.equal(
    buildStartURL("https://api.example/ignored", "https://palathip.github.io/gen-flights/", "abc"),
    "https://api.example/v1/auth/github/start?return_to=https%3A%2F%2Fpalathip.github.io%2Fgen-flights%2F&handoff_challenge=abc",
  );
});

test("pkce challenge matches RFC 7636", async () => {
  const got = await challengeFromVerifier("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
  assert.equal(got, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("handoff fragment and auth failures", () => {
  assert.deepEqual(parseHandoffFragment("#gf_code=abc&gf_error="), { code: "abc", error: "" });
  assert.deepEqual(parseHandoffFragment("#gf_error=forbidden"), { code: "", error: "forbidden" });
  assert.equal(classifyAuthFailure(401, { reason: "expired" }), "expired");
  assert.equal(classifyAuthFailure(401, {}), "logged-out");
  assert.equal(classifyAuthFailure(403, {}), "forbidden");
  assert.equal(classifyAuthFailure(503, {}), "error");
});

test("generation 400 stays a retry, while 401 and 403 stay auth results", () => {
  assert.equal(classifyGenerationFailure(400, { error: "invalid_request", field: "passengerName" }), "invalid-input");
  assert.equal(classifyGenerationFailure(413, {}), "invalid-input");
  assert.equal(classifyGenerationFailure(415, {}), "invalid-input");
  assert.equal(classifyGenerationFailure(401, { reason: "expired" }), "expired");
  assert.equal(classifyGenerationFailure(401, { reason: "invalid" }), "logged-out");
  assert.equal(classifyGenerationFailure(403, { error: "forbidden" }), "forbidden");
  assert.equal(
    invalidInputMessage({ field: "passengerName" }),
    "The Passenger name field is not valid. Adjust the length or special characters, then try again.",
  );
  assert.equal(invalidInputMessage({ field: "<script>" }).includes("<script>"), false);
  assert.match(invalidInputMessage({}), /did not pass validation/);
});

test("session account fields are optional and cannot inject a url", () => {
  assert.deepEqual(accountFromSession(null), { login: "", avatarUrl: "" });
  assert.deepEqual(accountFromSession({ authenticated: true }), { login: "", avatarUrl: "" });
  assert.deepEqual(
    accountFromSession({
      login: "palathip",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    }),
    { login: "palathip", avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4" },
  );
  assert.equal(accountFromSession({ login: "../admin", avatar_url: "javascript:alert(1)" }).login, "");
  assert.equal(accountFromSession({ avatar: "https://evil.example/a.png" }).avatarUrl, "");
  assert.equal(accountFromSession({ avatarUrl: "http://avatars.githubusercontent.com/u/1" }).avatarUrl, "");
});

test("return_to canonicalizes only the two allowlisted GitHub Pages URLs", () => {
  assert.equal(
    canonicalReturnTo("https://palathip.github.io/gen-flights"),
    "https://palathip.github.io/gen-flights/",
  );
  assert.equal(
    canonicalReturnTo("https://palathip.github.io/gen-flights/"),
    "https://palathip.github.io/gen-flights/",
  );
  assert.equal(
    canonicalReturnTo("https://palathip.github.io/gen-flights/index.html?x=1#gf_code=nope"),
    "https://palathip.github.io/gen-flights/index.html",
  );
  assert.equal(
    buildStartURL(
      "https://boombibu-api.vercel.app",
      canonicalReturnTo("https://palathip.github.io/gen-flights"),
      "abc",
    ),
    "https://boombibu-api.vercel.app/v1/auth/github/start?return_to=https%3A%2F%2Fpalathip.github.io%2Fgen-flights%2F&handoff_challenge=abc",
  );
  for (const bad of [
    "https://palathip.github.io/gen-flights/extra",
    "https://palathip.github.io/gen-flights.evil/",
    "https://palathip.github.io.evil.com/gen-flights/",
    "https://evil.example/gen-flights/",
    "http://palathip.github.io/gen-flights/",
    "https://user@palathip.github.io/gen-flights/",
    "https://palathip.github.io/gen-flights/../",
    "https://127.0.0.1:5500/gen-flights/",
  ]) {
    assert.equal(canonicalReturnTo(bad), "", bad);
  }
});

test("view model displays server text and does not rebuild the qr payload", () => {
  const view = viewModel({
    statusLabel: "FLIGHT READY",
    bannerLine: "FD-3110 TO BANGKOK",
    passengerName: "A&B",
    flightNo: "fd-1",
    fromCity: "HATYAI",
    toCity: "bangkok",
    fromAirportDetail: "",
    toAirportDetail: "Don Mueang",
    showRouteDetails: true,
    fromCode: "HDY",
    toCode: "DMK",
    gate: "G12",
    boarding: "09:45",
    seat: "14A",
    flightClass: "ECONOMY",
    flightDate: "24 OCT 23",
    zone: "ZONE 2",
    bookingRefLine: "BOOKING REF: V882YQ9",
    qrPayload: "{\"airline\":\"AirAsia\",\"ref\":\"V882YQ9\"}",
  });
  assert.equal(view.outToCityTitle, "bangkok");
  assert.equal(view.outPassenger, "A&B");
  assert.equal(view.qrPayload, "{\"airline\":\"AirAsia\",\"ref\":\"V882YQ9\"}");
  assert.equal(view.showRouteDetails, true);
  assert.equal(viewModel({}).outPassenger, "\u2014");
  assert.equal(viewModel({}).qrPayload, "");
});

test("public page does not keep the old in-browser generator", async () => {
  const html = await readFile(path.join(root, "gen-flights/index.html"), "utf8");
  const client = await readFile(path.join(root, "gen-flights/client.js"), "utf8");
  const cfg = await readFile(path.join(root, "gen-flights/api-config.js"), "utf8");
  const nav = await readFile(path.join(root, "site-nav.js"), "utf8");
  assert.equal(html.includes("JSON.stringify"), false);
  assert.equal(html.includes("function render("), false);
  assert.match(html, /api-config\.js/);
  assert.match(html, /client\.js/);
  assert.match(html, /id="btnGen" disabled/);
  assert.equal(client.includes("localStorage"), false);
  assert.equal(client.includes("JSON.stringify({\n        airline"), false);
  assert.match(client, /sessionStorage/);
  assert.match(client, /credentials:\s*"omit"/);
  assert.match(client, /history\.replaceState/);
  assert.match(client, /canonicalReturnTo\(location\.href\)/);
  assert.equal(client.includes("location.origin + location.pathname"), false);
  const configured = cfg.match(/window\.GEN_FLIGHTS_API_BASE\s*=\s*"([^"]*)"\s*;/);
  assert.ok(configured);
  const configuredURL = new URL(configured[1]);
  assert.equal(configuredURL.origin, "https://boombibu-api.vercel.app");
  assert.equal(configuredURL.pathname, "/");
  assert.equal(configuredURL.search, "");
  assert.equal(configuredURL.hash, "");
  assert.match(html, /id="flightEditor" hidden/);
  assert.match(html, /id="flightPreview" hidden/);
  assert.equal(showsFlightWorkspace("logged-out"), false);
  assert.equal(showsFlightWorkspace("forbidden"), false);
  assert.equal(showsFlightWorkspace("expired"), false);
  assert.equal(showsFlightWorkspace("logout"), false);
  assert.equal(showsFlightWorkspace("loading"), false);
  assert.equal(showsFlightWorkspace("ready"), true);
  assert.equal(showsFlightWorkspace("working"), true);
  assert.equal(showsFlightWorkspace("invalid-input"), true);
  assert.match(nav, /label: 'Gen Flights', href: href\('gen-flights\/index\.html'\)/);
});

test("signed-out document has no ticket form controls", async () => {
  const html = await readFile(path.join(root, "gen-flights/index.html"), "utf8");
  const live = html.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, "");
  assert.equal(/<input\b/i.test(live), false);
  assert.equal(/<textarea\b/i.test(live), false);
  assert.equal(/<select\b/i.test(live), false);
  assert.equal(live.includes('id="btnGen"'), false);
  assert.equal(live.includes('id="passengerName"'), false);
  assert.equal(live.includes('id="flightEditor"'), false);
  assert.equal(live.includes('id="flightPreview"'), false);
  const placeholder = live.slice(
    live.indexOf('id="flightPlaceholder"'),
    live.indexOf('id="flightMount"'),
  );
  assert.equal(/<input\b/i.test(placeholder), false);
  assert.equal(/<button\b/i.test(placeholder), false);
  assert.match(placeholder, /aria-hidden="true"/);
  assert.match(html, /<template\b[^>]*id="flightWorkspaceTemplate"/);
  assert.match(html, /id="btnGen" disabled/);
  const client = await readFile(path.join(root, "gen-flights/client.js"), "utf8");
  assert.match(client, /function unmountFlightWorkspace/);
  assert.match(client, /mount\.replaceChildren\(\)/);
});

test("sign-in and sign-out copy is English", async () => {
  const html = await readFile(path.join(root, "gen-flights/index.html"), "utf8");
  const client = await readFile(path.join(root, "gen-flights/client.js"), "utf8");
  assert.match(html, />Sign in with GitHub</);
  assert.match(html, />Log out</);
  assert.match(html, /Checking authorization…/);
  assert.match(html, /\.layout\.is-locked \.auth-actions \{\s*justify-content: center;/);
  assert.equal(html.includes("เข้าสู่ระบบ"), false);
  assert.equal(html.includes("ออกจากระบบ"), false);
  assert.match(client, /Only an authorized GitHub account can create a boarding pass\./);
  assert.match(client, /Signed out\. The token in this tab was removed/);
  assert.match(client, /Signed in\. You can create a ticket\./);
  assert.match(client, /Creating a ticket…/);
  assert.equal(client.includes("กำลังสร้างตั๋ว"), false);
  assert.match(client, /Sign in to generate a QR code\./);
  assert.match(client, /GitHub authorization was cancelled\./);
  assert.equal(client.includes("เข้าสู่ระบบ"), false);
  assert.equal(client.includes("ออกจากระบบ"), false);
});

test("website tree does not contain the Go API or secret material", async () => {
  const bannedName = new Set(["go.mod", "go.sum", "vercel.json"]);
  const secretNeedles = [
    "APP_JWT_" + "SECRET",
    "AUTH_STATE_" + "SECRET",
    "GITHUB_CLIENT_" + "SECRET",
    "OWNER_GITHUB_" + "ID",
    "ghp" + "_",
    "gho" + "_",
    "github_pat" + "_",
    "BEGIN OPENSSH " + "PRIVATE KEY",
    "BEGIN RSA " + "PRIVATE KEY",
  ];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "images") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        assert.equal(entry.name === "backend" && dir === root, false);
        await walk(full);
        continue;
      }
      assert.equal(entry.name.endsWith(".go"), false, full);
      assert.equal(bannedName.has(entry.name), false, full);
      if (!/\.(html|js|mjs|css|json|yml|md|txt)$/.test(entry.name)) continue;
      const text = await readFile(full, "utf8");
      for (const needle of secretNeedles) {
        assert.equal(text.includes(needle), false, `${full} contains ${needle}`);
      }
    }
  }
  await walk(root);
});
