import { AIConfig, GenerationPrompt } from "../types";
import { supabase } from "./supabaseClient";

export class AIService {
  private config: AIConfig | null = null;

  constructor() {}

  // === 最新のAI設定をSupabaseから取得 ===
  private async loadActiveConfig() {
    const { data, error } = await supabase
      .from("ai_configs")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("AI設定取得エラー:", error);
      throw new Error("AI設定の取得に失敗しました。AI設定ページで再設定してください。");
    }

    if (!data) {
      throw new Error("AI設定が見つかりません。AI設定ページで設定してください。");
    }

    this.config = data;
  }

  // === 記事生成（メイン処理） ===
  async generateArticle(prompt: GenerationPrompt) {
    try {
      // 設定をロード
      if (!this.config) await this.loadActiveConfig();

      // 必須項目のチェック
      if (!this.config?.provider) throw new Error("AIプロバイダが設定されていません。AI設定ページで設定してください。");
      if (!this.config?.api_key) throw new Error("APIキーが設定されていません。AI設定ページで設定してください。");
      if (!this.config?.model) throw new Error("モデルが設定されていません。AI設定ページでモデルを選択してください。");

      let result;
      switch (this.config.provider) {
        case "openai":
          result = await this.callOpenAI(prompt);
          break;
        case "gemini":
          result = await this.callGemini(prompt);
          break;
        case "claude":
          result = await this.callClaude(prompt);
          break;
        default:
          throw new Error(`未対応のAIプロバイダです: ${this.config.provider}`);
      }

      const { title, content } = result;
      const excerpt = this.generateExcerpt(content);
      const keywords = this.extractKeywords(content, prompt.topic);
      const seoScore = this.calculateSEOScore(title, content, keywords);
      const readingTime = this.calculateReadingTime(content);

      return { title, content, excerpt, keywords, seoScore, readingTime };
    } catch (error) {
      console.error("記事生成エラー:", error);
      throw error;
    }
  }

  // === プロンプト生成 ===
  private buildPrompt(prompt: GenerationPrompt): string {
    // 文字数指定
    const lengthText =
      prompt.length === "short"
        ? "約1,000〜2,000文字"
        : prompt.length === "medium"
        ? "約2,000〜4,000文字"
        : prompt.length === "long"
        ? "約4,000〜6,000文字"
        : "指定なし";

    // トーン
    const toneText = (() => {
      switch (prompt.tone) {
        case "professional":
          return "専門的でフォーマルな文体で書いてください。";
        case "casual":
          return "親しみやすくカジュアルな文体で書いてください。";
        case "technical":
          return "技術的で正確な文体で書いてください。";
        case "friendly":
          return "読者に語りかけるようなフレンドリーな文体で書いてください。";
        default:
          return "";
      }
    })();

    // セクション指定
    const sections = [];
    if (prompt.includeIntroduction) sections.push("導入部分（冒頭）");
    if (prompt.includeConclusion) sections.push("まとめ（結論）");
    if (prompt.includeSources) sections.push("参考文献や引用元リスト");
    const sectionText = sections.length ? `${sections.join("、")}を含めてください。` : "";

    return `
以下の条件に基づいて、日本語でSEO最適化されたブログ記事を書いてください。

【トピック】
${prompt.topic}

【キーワード】
${prompt.keywords?.join("、") || "（指定なし）"}

【トーン】
${toneText}

【文字数】
${lengthText}

【構成】
${sectionText}

【指示】
- 見出しには「##」を使用して構造化してください。
- 内容をわかりやすく、段落を分けて書いてください。
- タイトルと本文を分けて出力してください。
`;
  }

  // === Gemini ===
  private async callGemini(prompt: GenerationPrompt) {
    const response = await fetch("/.netlify/functions/gemini-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: this.buildPrompt(prompt),
        apiKey: this.config?.api_key,
        model: this.config?.model,
        temperature: this.config?.temperature,
        max_tokens: this.config?.max_tokens,
      }),
    });

    if (!response.ok) throw new Error(`Gemini APIエラー: ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const [title, ...body] = text.split("\n");
    return {
      title: title.replace(/^#+\s*/, "").trim(),
      content: body.join("\n").trim(),
    };
  }

  // === Claude ===
  private async callClaude(prompt: GenerationPrompt) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config?.api_key || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config?.model,
        temperature: this.config?.temperature,
        max_tokens: this.config?.max_tokens,
        messages: [{ role: "user", content: this.buildPrompt(prompt) }],
      }),
    });

    if (!response.ok) throw new Error(`Claude APIエラー: ${response.status}`);
    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const [title, ...body] = text.split("\n");
    return {
      title: title.replace(/^#+\s*/, "").trim(),
      content: body.join("\n").trim(),
    };
  }

  // === OpenAI ===
  private async callOpenAI(prompt: GenerationPrompt) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config?.api_key}`,
      },
      body: JSON.stringify({
        model: this.config?.model,
        temperature: this.config?.temperature,
        max_tokens: this.config?.max_tokens,
        messages: [
          { role: "system", content: "You are a professional Japanese SEO writer." },
          { role: "user", content: this.buildPrompt(prompt) },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI APIエラー: ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const [title, ...body] = text.split("\n");
    return {
      title: title.replace(/^#+\s*/, "").trim(),
      content: body.join("\n").trim(),
    };
  }

  // === Utility関数 ===
  private generateExcerpt(content: string): string {
    const clean = content.replace(/^#+\s+/gm, "").trim();
    const first = clean.split("\n\n")[0];
    return first.length > 150 ? first.substring(0, 150) + "..." : first;
  }

  private extractKeywords(content: string, topic: string): string[] {
    const words = content.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9]+/gu) || [];
    const freq: Record<string, number> = {};
    words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([w]) => w);
    return [topic, ...sorted.slice(0, 5)];
  }

  private calculateSEOScore(title: string, content: string, keywords: string[]): number {
    let score = 0;
    if (title.length >= 20 && title.length <= 60) score += 20;
    if (content.length > 2000) score += 40;
    if (keywords.some((k) => content.includes(k))) score += 20;
    if ((content.match(/^##/gm) || []).length >= 3) score += 20;
    return Math.min(100, score);
  }

  private calculateReadingTime(content: string): number {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200);
  }
}
