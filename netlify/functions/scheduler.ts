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
    const currentTim
