import { createClient } from "@supabase/supabase-js";

// === Supabaseクライアント作成 ===
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// === メイン関数 ===
export const handler = async (event: any) => {
  try {
    console.log("✅ Scheduler function triggered.");

    // スケジュール設定を取得
    const { data: schedules, error } = await supabase
      .from("schedule_settings")
      .select("*")
      .eq("enabled", true);

    if (error) {
      console.error("❌ Supabase取得エラー:", error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Supabase取得に失敗しました" }),
      };
    }

    if (!schedules || schedules.length === 0) {
      console.log("⏹ 有効なスケジュール設定がありません。");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "スケジュールなし" }),
      };
    }

    // 現在時刻（日本時間）
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${hours}:${minutes}`;

    console.log("🕒 現在時刻:", currentTime);

    // 時刻が一致するスケジュールを抽出
    const matched = schedules.filter((s) => s.time === currentTime);

    if (matched.length === 0) {
      console.log("⚪ 投稿時刻が一致するスケジュールはありません。");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "一致するスケジュールなし" }),
      };
    }

    // 投稿処理を実行（例：WordPressへの投稿関数を呼ぶ）
    for (const schedule of matched) {
      console.log(`🚀 投稿実行: ${schedule.wordpress_id} at ${schedule.time}`);

      // TODO: WordPress投稿ロジックを呼び出す
      // await postToWordPress(schedule);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `${matched.length} 件のスケジュールを処理しました`,
      }),
    };
  } catch (e) {
    console.error("💥 予期せぬエラー:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "サーバーエラー", error: e }),
    };
  }
};
