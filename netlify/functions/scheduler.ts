
import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { AIService } from "../../src/services/aiService"; // ★ 追加

process.env.TZ = "Asia/Tokyo"; // JST固定


// === Supabase接続 ===
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// === JST時刻判定 ===
function isWithinOneMinute(targetTime: string): boolean {
  if (!targetTime) return false;
  const [h, m] = targetTime.split(":").map(Number);

  // 現在時刻（NetlifyはTZ=Asia/Tokyoを指定済み）
  const now = new Date();
  console.log("🕒 現在時刻(JST):", now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }));

  // SupabaseのtimeをJSTとして扱う
  const target = new Date();
  target.setHours(h, m, 0, 0);
  console.log("🎯 目標時刻(JST):", target.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }));

  const diff = Math.abs(now.getTime() - target.getTime());
  console.log("⏱ 差(秒):", diff / 1000);

  return diff <= 90 * 1000;
}

// === WordPress投稿 ===
async function postToWordPress(config: any, article: { title: string; content: string }) {
  const url = `${config.url}/wp-json/wp/v2/posts`;
  const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

  let categoryIds: number[] = [];

  if (config.category) {
    const categorySlug = encodeURIComponent(config.category.trim());
    const catRes = await fetch(`${config.url}/wp-json/wp/v2/categories?slug=${categorySlug}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    let catData = await catRes.json();

    if (!Array.isArray(catData) || catData.length === 0) {
      const nameRes = await fetch(`${config.url}/wp-json/wp/v2/categories?search=${categorySlug}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      catData = await nameRes.json();
    }

    if (Array.isArray(catData) && catData.length > 0) {
      categoryIds = [catData[0].id];
      console.log(`✅ カテゴリ '${config.category}' → ID ${catData[0].id}`);
    } else {
      console.warn(`⚠️ カテゴリ '${config.category}' が見つかりません`);
    }
  }

  const body: any = {
    title: article.title,
    content: article.content,
    status: "publish",
  };
  if (categoryIds.length > 0) body.categories = categoryIds;

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

// === メイン処理 ===
export const handler: Handler = async () => {
  console.log("✅ スケジューラー起動");

  try {
    // --- スケジュール取得 ---
    const { data: schedules, error: scheduleError } = await supabase
      .from("schedule_settings")
      .select("*, wordpress_config_id")
      .eq("enabled", true);

    if (scheduleError) throw new Error("スケジュール取得失敗: " + scheduleError.message);
    if (!schedules?.length) return { statusCode: 200, body: "No active schedules" };

    const aiService = new AIService();

    for (const schedule of schedules) {
  if (!isWithinOneMinute(schedule.time)) continue;

  // --- WordPress設定取得 ---
  const { data: wp, error: wpError } = await supabase
    .from("wordpress_configs")
    .select("*")
    .eq("id", schedule.wordpress_config_id)
    .eq("is_active", true)
    .single();

  if (wpError || !wp) {
    console.log(`⚠️ WordPress設定が見つかりません (ID: ${schedule.wordpress_config_id})`);
    continue;
  }

  console.log(`🌐 投稿先サイト: ${wp.sitename || "(名称未設定)"} → ${wp.url}`);

  // --- ✅ キーワードをランダムに1つだけ抽出 ---
  let keyword = "最新情報";
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

  console.log(`🎯 今回選ばれたキーワード: ${keyword}`);

  // --- ✅ ここで1記事のみ生成 ---
  const prompt = {
    topic: keyword,
    keywords: [keyword],
    tone: "friendly",
    length: "medium",
    includeIntroduction: true,
    includeConclusion: true,
    includeSources: false,
  };

  const article = await aiService.generateArticle(prompt);
  console.log("✅ 記事生成完了:", article.title);

  // --- WordPress投稿 ---
  const wpPost = await postToWordPress(wp, article);
  console.log("📰 投稿完了:", wpPost.link);

  // --- Supabase保存 ---
  const { error: insertError } = await supabase.from("articles").insert({
    title: article.title,
    content: article.content,
    category: wp.category,
    wordpress_config_id: wp.id,
    wordpress_post_id: String(wpPost.id),
    status: "published",
    created_at: new Date().toISOString(),
  });

  if (insertError)
    throw new Error("記事保存失敗: " + insertError.message);

  // ✅ ← この位置でループ終了（1記事だけ）
  break;
}

    return { statusCode: 200, body: "Scheduler executed successfully" };
  } catch (err: any) {
    console.error("💥 エラー詳細:", err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
