import fetch from "node-fetch";
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

process.env.TZ = "Asia/Tokyo"; // JSTに固定

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
- タイトルは1行で魅力的に
- 本文は見出し(H2)と段落を含み、全体で700〜900文字程度
- 文体は「です・ます調」
- 最後に行動を促す一文を加える
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent",
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
    const errorText = await response.text();
    throw new Error(`Gemini APIエラー: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const titleMatch = content.match(/^#?\s*(.+?)\n/);
  const title = titleMatch ? titleMatch[1] : `${keyword}に関する最新情報`;

  return { title, content };
}

// === WordPress投稿 ===
async function postToWordPress(config: any, article: { title: string; content: string }) {
  const url = `${config.url}/wp-json/wp/v2/posts`;
  const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

  const body = {
    title: article.title,
    content: article.content,
    status: "publish",
  };

  if (config.category) {
    body["categories"] = [Number(config.category)];
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress投稿失敗: ${response.status} ${errorText}`);
  }

  return response.json();
}

// === JST時刻判定 ===
function isWithinOneMinute(targetTime: string): boolean {
  if (!targetTime) return false;
  const [h, m] = targetTime.split(":").map(Number);
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const target = new Date(jstNow);
  target.setHours(h, m, 0, 0);
  const diff = Math.abs(jstNow.getTime() - target.getTime());
  return diff <= 60 * 1000;
}

// === メイン処理 ===
export const handler: Handler = async () => {
  console.log("✅ スケジューラー起動");

  try {
    const { data: schedules, error } = await supabase
      .from("schedule_settings")
      .select("*, wordpress_config_id")
      .eq("enabled", true);

    if (error) throw new Error("スケジュール取得失敗: " + error.message);
    if (!schedules?.length) return { statusCode: 200, body: "No active schedules" };

    for (const schedule of schedules) {
      if (!isWithinOneMinute(schedule.time)) {
        console.log(`⏸ ${schedule.time} は現在時刻と一致しないためスキップ`);
        continue;
      }

      const { data: wp, error: wpError } = await supabase
        .from("wordpress_config")
        .select("*")
        .eq("id", schedule.wordpress_config_id)
        .eq("is_active", true)
        .single();

      if (wpError || !wp) {
        console.log("⚠️ WordPress設定が見つかりません");
        continue;
      }

      let keyword = "";
      try {
        if (Array.isArray(schedule.keywords)) {
          keyword = schedule.keywords[Math.floor(Math.random() * schedule.keywords.length)];
        } else if (typeof schedule.keywords === "string") {
          const arr = JSON.parse(schedule.keywords);
          keyword = arr[Math.floor(Math.random() * arr.length)];
        }
      } catch {
        keyword = String(schedule.keywords || "最新情報");
      }

      console.log(`🎯 キーワード: ${keyword}`);

      const article = await generateArticle(keyword);
      const wpPost = await postToWordPress(wp, article);

      await supabase.from("articles").insert({
        title: article.title,
        content: article.content,
        category: wp.category,
        wordpress_config_id: wp.id,
        wordpress_post_id: String(wpPost.id),
        status: "published",
        created_at: new Date().toISOString(),
      });

      console.log(`✅ 投稿完了: ${wpPost.link}`);
    }

    return { statusCode: 200, body: "Scheduler executed successfully" };
  } catch (err: any) {
    console.error("💥 エラー:", err.message);
    return { statusCode: 500, body: err.message };
  }
};
