import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createAnalyzeMistakeHandler } from "./handler.ts";

function request(body: unknown, headers: Record<string, string> = { Authorization: "Bearer test" }) {
  return new Request("https://example.test/analyze-mistake", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function harness({ quota = true, fetchImpl = () => Promise.resolve(new Response("{}", { status: 503 })) } = {}) {
  const calls: string[] = [];
  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { email_confirmed_at: "today" } }, error: null }) },
    rpc: (name: string) => {
      calls.push(name);
      if (name === "reserve_tutor_quota") return Promise.resolve({ data: quota, error: null });
      if (name === "store_ai_insight") return Promise.resolve({ data: { hint: "Try again." }, error: null });
      return Promise.resolve({ data: null, error: null });
    },
  };
  const handler = createAnalyzeMistakeHandler({
    createClient: (() => client) as never,
    fetchImpl,
    env: (name) => ({
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
    }[name]),
    randomUUID: () => "request-1",
    sleep: async () => {},
  });
  return { handler, calls };
}

test("rejects requests without authentication", async () => {
  const { handler } = harness();
  const response = await handler(request({ gameId: "physics", levelNumber: 1 }, {}));
  assertEquals(response.status, 503);
});

test("rejects invalid mistake data before reserving quota", async () => {
  const { handler, calls } = harness();
  const response = await handler(request({ gameId: "unknown", levelNumber: 1 }));
  assertEquals(response.status, 400);
  assertEquals(calls.length, 0);
});

test("returns rate limited when quota is exhausted", async () => {
  const { handler, calls } = harness({ quota: false });
  const response = await handler(request({ gameId: "physics", levelNumber: 1 }));
  assertEquals(response.status, 429);
  assertEquals((await response.json()).state, "AI_RATE_LIMITED");
  assertEquals(calls, ["reserve_tutor_quota"]);
});

test("retries provider failures and refunds quota", async () => {
  let attempts = 0;
  const { handler, calls } = harness({
    fetchImpl: async () => {
      attempts += 1;
      return new Response("busy", { status: 503 });
    },
  });
  const response = await handler(request({ gameId: "physics", levelNumber: 1 }));
  assertEquals(response.status, 503);
  assertEquals(attempts, 3);
  assertEquals(calls, ["reserve_tutor_quota", "refund_tutor_quota"]);
});

test("returns a successful insight and stores it", async () => {
  const providerBody = {
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      mistake_category: "shot_missed",
      confidence: 0.9,
      explanation: "The shot was short.",
      hint: "Increase speed slightly.",
      next_question: "What changed?",
    }) }] } }],
  };
  const { handler, calls } = harness({
    fetchImpl: () => Promise.resolve(new Response(JSON.stringify(providerBody), { status: 200 })),
  });
  const response = await handler(request({ gameId: "physics", levelNumber: 1, category: "shot_missed", details: {} }));
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.state, "AI_SUCCESS");
  assert(body.insight);
  assertEquals(calls, ["reserve_tutor_quota", "store_ai_insight"]);
});

test("refunds quota for invalid provider JSON", async () => {
  const { handler, calls } = harness({
    fetchImpl: () => Promise.resolve(new Response("not-json", { status: 200 })),
  });
  const response = await handler(request({ gameId: "robo_maze", levelNumber: 2 }));
  assertEquals(response.status, 502);
  assertEquals((await response.json()).state, "AI_INVALID_RESPONSE");
  assertEquals(calls, ["reserve_tutor_quota", "refund_tutor_quota"]);
});
