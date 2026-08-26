import assert from "node:assert/strict";
import test from "node:test";
import { accountJourneyCopy, passwordSignals, passwordStrength } from "../lib/account-ux.ts";

test("password strength keeps backend minimum separate from recommendations", () => {
  assert.equal(passwordStrength("short").label, "Too short");
  assert.equal(passwordSignals("abcdefghij")[0].met, true);
  assert.equal(passwordStrength("abcdefghij").label, "Okay");
  assert.equal(passwordStrength("abc12345678901").label, "Good");
  assert.equal(passwordStrength("abc12345678901!").label, "Strong");
});

test("account journey copy explains guest upgrade and privacy-safe recovery", () => {
  assert.match(accountJourneyCopy("register").description, /guest progress/i);
  assert.match(accountJourneyCopy("login").description, /server-side progress/i);
  assert.match(accountJourneyCopy("forgot").description, /same whether or not/i);
});
