export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { prompt, apiKey, model, temperature, max_tokens } = body;

    // === バリデーション ===
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key missing" }),
        { status: 400 }
      );
    }

    const modelName = model || "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // === Gemini API 呼び出し ===
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: max_tokens ?? 4000,
        },
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Gemini API Error:", data);
      return new Response(
        JSON.stringify({ error: "Gemini API error", details: data }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err: any) {
    console.error("Gemini Proxy internal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
};
