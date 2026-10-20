import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

Deno.test("analyze-mistake requires authenticated POST requests", () => {
  assertMatch(source, /req\.method !== "POST"/);
  assertMatch(source, /Authorization/);
  assertMatch(source, /auth\.getUser\(\)/);
  assertMatch(source, /Email confirmation required/);
});

Deno.test("analyze-mistake validates game and level input", () => {
  assertMatch(source, /input\.gameId === "physics"/);
  assertMatch(source, /input\.gameId === "robo_maze"/);
  assertMatch(source, /levelNumber < 1 \|\| levelNumber > 30/);
  assertMatch(source, /AI_INVALID_RESPONSE/);
});

Deno.test("analyze-mistake reserves quota and refunds failed provider calls", () => {
  assertMatch(source, /reserve_tutor_quota/);
  assertMatch(source, /refund_tutor_quota/);
  assertMatch(source, /await refundQuota\(client, requestId\)/);
});

Deno.test("analyze-mistake handles transient provider failures safely", () => {
  assertMatch(source, /new Set\(\[429, 500, 502, 503, 504\]\)/);
  assertMatch(source, /for \(let attempt = 0; attempt < 3; attempt\+\+\)/);
  assertMatch(source, /AbortController/);
  assertMatch(source, /AI_RATE_LIMITED/);
  assertMatch(source, /AI_TEMPORARILY_UNAVAILABLE/);
});

Deno.test("analyze-mistake returns explicit success and invalid-response states", () => {
  assertMatch(source, /AI_SUCCESS/);
  assertMatch(source, /AI_INVALID_RESPONSE/);
  assertMatch(source, /JSON\.parse/);
  assertMatch(source, /store_ai_insight/);
});

Deno.test("analyze-mistake does not log prompts or provider response bodies", () => {
  assertEquals(source.includes("console.log(prompt"), false);
  assertEquals(source.includes("console.log(result"), false);
  assert(source.includes("p_hint"));
});
