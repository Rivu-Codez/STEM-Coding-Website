import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" }
});
const clean = (value: unknown, fallback: string, max = 600) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, max) || fallback;
};
function publicKey() {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  const authorization = req.headers.get("Authorization");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!authorization || !geminiKey) return json({ error: "Tutor service is not configured" }, 503);

  const client = createClient(Deno.env.get("SUPABASE_URL")!, publicKey(), {
    global: { headers: { Authorization: authorization } }
  });
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return json({ error: "Authentication required" }, 401);

  const input = await req.json();
  const gameId = input.gameId === "physics" || input.gameId === "robo_maze" ? input.gameId : null;
  const levelNumber = Number(input.levelNumber);
  if (!gameId || !Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 30) {
    return json({ error: "Invalid mistake data" }, 400);
  }
  const recent = await client.from("ai_insights").select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((recent.count || 0) >= 10) return json({ error: "Tutor limit reached; using a standard hint." }, 429);

  const prompt = [
    "You are a patient STEM tutor for a school student.",
    "Analyze one failed game attempt and return only valid JSON.",
    "Do not give the complete solution or write the student's program.",
    "Use this exact shape: {mistake_category, confidence, explanation, hint, next_question}.",
    "Keep each text field under 300 characters. Use a confidence number from 0 to 1.",
    "Game: " + gameId,
    "Level: " + levelNumber,
    "Client category: " + clean(input.category, "unknown", 80),
    "Attempt details: " + JSON.stringify(input.details || {}).slice(0, 3000)
  ].join("\n");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    }
  );
  if (!response.ok) {
    const errorText = (await response.text()).slice(0, 1000);
    console.error("Gemini request failed", {
      status: response.status,
      model,
      error: errorText
    });
    return json({ error: "Tutor temporarily unavailable" }, 502);
  }
  const result = await response.json();
  const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  let insight: Record<string, unknown>;
  try {
    insight = JSON.parse(raw.trim());
  } catch {
    return json({ error: "Tutor returned an unreadable response" }, 502);
  }
  const record = {
    user_id: auth.user.id, game_id: gameId, level_number: levelNumber,
    mistake_category: clean(insight.mistake_category, input.category || "unknown", 80),
    confidence: Math.min(1, Math.max(0, Number(insight.confidence) || 0)),
    explanation: clean(insight.explanation, "Review the last attempt and change one variable.", 300),
    hint: clean(insight.hint, "Try one small change and test it again.", 300),
    next_question: clean(insight.next_question, "What changed when you tried that?", 300),
    model
  };
  const saved = await client.from("ai_insights").insert(record).select().single();
  if (saved.error) return json({ error: "Could not save tutor insight" }, 500);
  return json({ insight: saved.data });
});
