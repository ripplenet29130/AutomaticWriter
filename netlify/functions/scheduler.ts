import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// === 環境変数 ===
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// === AI記事生成 ===
async function generateArticle(keyword: string) {
  const prompt = `次のキーワード「${keyword}」について日本語でSEO記事を作成してください。
・タイトルは読者の関心を引くものにしてください。
・本文は500〜700文字で、見出しと段落を含めてください。`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const title = content.split("\n")[0].replace(/^#\s*/, ""); // 最初の見出しをタイトル扱い
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

// === メイン処理 ===
export const handler: Handler = async () => {
  try {
    console.log("✅ スケジューラー起動");

    // 有効スケジュールを取得
    const { data: schedules, error } = await supabase
      .from("schedule_settings")
      .select("*, wordpress_config_id")
      .eq("enabled", true);

    if (error || !schedules?.length) {
      console.log("⏹ スケジュールなし");
      return { statusCode: 200, body: "No active schedules" };
    }

    for (const schedule of schedules) {
      // 紐づくWordPress設定を取得
      const { data: wp } = await supabase
        .from("wordpress_config")
        .select("*")
        .eq("id", schedule.wordpress_config_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!wp) continue;

      // キーワード抽出
      const keywords = schedule.keyword
        ?.split(",")
        .map((k: string) => k.trim())
        .filter(Boolean);

      if (!keywords?.length) continue;

      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      console.log(`🎯 選択キーワード: ${keyword}`);

      // AI記事生成
      const article = await generateArticle(keyword);

      // WordPress投稿
      const wpPost = await postToWordPress(wp, article);

      // 投稿結果をarticlesに記録
      await supabase.from("articles").insert({
        title: article.title,
        content: article.content,
        category: wp.category,
        wordpress_config_id: wp.id,
        wordpress_post_id: wpPost.id.toString(),
        status: "published",
        created_at: new Date().toISOString(),
      });

      console.log(`✅ 投稿完了: ${wpPost.link}`);

      // 使用済みキーワードを更新（任意で）
      const usedList = schedule.used_keywords || [];
      usedList.push(keyword);
      await supabase
        .from("schedule_settings")
        .update({ used_keywords: usedList })
        .eq("id", schedule.id);
    }

    return { statusCode: 200, body: "Auto-post completed" };
  } catch (err: any) {
    console.error("💥 エラー:", err.message);
    return { statusCode: 500, body: err.message };
  }
};
