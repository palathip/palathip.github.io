import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  apiOrigin,
  buildStartURL,
  challengeFromVerifier,
  classifyAuthFailure,
  isSafeAPIBase,
  parseHandoffFragment,
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
  assert.match(cfg, /window\.GEN_FLIGHTS_API_BASE\s*=\s*""\s*;/);
  assert.equal(nav.includes("Gen Flights"), false);
  assert.equal(nav.includes('href("gen-flights'), false);
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
