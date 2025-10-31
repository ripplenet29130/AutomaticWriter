import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// === Supabase接続 ===
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// === Gemini 2.0 Flash による記事生成 ===
async function generateArticle(keyword: string) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
  const prompt = `
あなたはSEOに詳しい日本語のWebライターです。
次のキーワード「${keyword}」に関する記事を作成してください。

条件:
- タイトルは1行で魅力的に（読者がクリックしたくなるように）
- 本文は見出し(H2)と段落を含み、全体で700〜900文字程度
- 文体は「です・ます調」
- 最後に読者へ行動を促す一文を加える
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini APIエラー: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const titleMatch = content.match(/^#?\s*(.+?)\n/);
  const title = titleMatch ? titleMatch[1] : `${keyword}に関する最新情報`;

  return { title, content };
}

// === WordPress投稿 ===
async function postToWordPress(config: any, article: { title: string; content: string }) {
  const url = `${config.url}/wp-json/wp/v2/posts`;
  const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: article.title,
      content: article.content,
      status: "publish",
      categories: config.category ? [Number(config.category)] : [],
    }),
  });

  if (!response.ok) {
    throw new Error(`WordPress投稿失敗: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

// === 時刻判定（±1分の許容） ===
function isWithinOneMinute(targetTime: string): boolean {
  const [h, m] = targetTime.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const diff = Math.abs(now.getTime() - target.getTime());
  return diff <= 60 * 1000; // ±1分以内
}

// === メイン処理 ===
export const handler: Handler = async () => {
  console.log("✅ スケジューラー起動");

  try {
    // スケジュール設定を取得
    const { data: schedules, error } = await supabase
      .from("schedule_settings")
      .select("*, wordpress_config_id")
      .eq("enabled", true);

    if (error || !schedules?.length) {
      console.log("⏹ スケジュールなし");
      return { statusCode: 200, body: "No active schedules" };
    }

    for (const schedule of schedules) {
      if (!isWithinOneMinute(schedule.time)) {
        console.log(`⏸ スキップ: ${schedule.time} は現在時刻と一致しません`);
        continue;
      }

      // WordPress設定を取得
      const { data: wp } = await supabase
        .from("wordpress_configs")
        .select("*")
        .eq("id", schedule.wordpress_config_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!wp) {
        console.log("⚠️ WordPress設定が見つかりません");
        continue;
      }

      // キーワード選択
      const keywords = schedule.keywords || [];
      const keyword = Array.isArray(keywords)
        ? keywords[Math.floor(Math.random() * keywords.length)]
        : String(keywords).split(",")[0];
      cons
