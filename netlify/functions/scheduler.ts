import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// ====== Supabaseクライアント初期化 ======
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ 公開鍵ではなくService Role Keyを使う
);

// ====== WordPress投稿関数 ======
async function postToWordPress(wpConfig: any, article: any) {
  const endpoint = `${wpConfig.url}/wp-json/wp/v2/posts`;
  const authHeader = Buffer.from(`${wpConfig.username}:${wpConfig.password}`).toString("base64");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: article.title,
      content: article.content,
      status: article.status || "publish",
      categories: [], // 必要ならカテゴリIDを指定
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WordPress投稿エラー: ${res.status} ${errText}`);
  }

  const json = await res.json();
  return json;
}

// ====== AI記事生成（シンプル版） ======
async function generateArticle(keyword: string) {
  const prompt = `次のキーワードに関するSEO記事を書いてください: ${keyword}`;
  const apiKey = process.env.OPENAI_API_KEY;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    }),
  });

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || "生成失敗";

  return {
    title: `${keyword}に関する最新情報`,
    content,
    status: "publish",
  };
}

// ====== メインハンドラー ======
export const handler: Handler = async () => {
  console.log("🕒 スケジューラー開始");

  // 有効なスケジュール設定を取得
  const { data: schedules, error } = await supabase
    .from("schedule_settings")
    .select("*")
    .eq("enabled", true);

  if (error || !schedules?.length) {
    console.log("⚠️ 有効なスケジュールがありません");
    return { statusCode: 200, body: "No schedules found" };
  }

  for (const schedule of schedules) {
    try {
      // WordPress設定を取得
      const { data: wpConfig } = await supabase
        .from("wordpress_configs")
        .select("*")
        .eq("id", schedule.wordpress_id)
        .single();

      if (!wpConfig) throw new Error("WordPress設定が見つかりません");

      // キーワードごとに記事生成＆投稿
      for (const keyword of schedule.keywords || []) {
        const article = await generateArticle(keyword);
        const posted = await postToWordPress(wpConfig, article);

        // Supabaseにログを保存
        await supabase.from("execution_logs").insert({
          action: "auto_post",
          status: "success",
          details: { keyword, post_id: posted.id },
        });
      }
    } catch (err: any) {
      console.error("❌ エラー:", err.message);

      await supabase.from("execution_logs").insert({
        action: "auto_post",
        status: "error",
        details: { message: err.message },
      });
    }
  }

  return { statusCode: 200, body: "Scheduler executed successfully" };
};
