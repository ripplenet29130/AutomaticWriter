import { AIConfig, GenerationPrompt } from '../types';

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generateArticle(prompt: GenerationPrompt) {
    try {
      if (!this.config.apiKey) {
        throw new Error('API key is not configured');
      }

      let content = '';
      let title = '';

      if (this.config.provider === 'openai') {
        const response = await this.callOpenAI(prompt);
        content = response.content;
        title = response.title;
      } else if (this.config.provider === 'gemini') {
        const response = await this.callGemini(prompt);
        content = response.content;
        title = response.title;
      } else if (this.config.provider === 'claude') {
        const response = await this.callClaude(prompt);
        content = response.content;
        title = response.title;
      } else {
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      }

      const excerpt = this.generateExcerpt(content);
      const keywords = this.extractKeywords(content, prompt.topic);
      const seoScore = this.calculateSEOScore(title, content, keywords);
      const readingTime = this.calculateReadingTime(content);

      return {
        title,
        content,
        excerpt,
        keywords,
        seoScore,
        readingTime
      };
    } catch (error) {
      console.error('Article generation error:', error);
      return this.generateMockArticle(prompt);
    }
  }

  // ===== OpenAI =====
  private async callOpenAI(prompt: GenerationPrompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional blog writer. Write engaging, informative articles in Japanese.'
          },
          {
            role: 'user',
            content: `以下のトピックについて、SEOに最適化された日本語のブログ記事を書いてください。

トピック: ${prompt.topic}
${prompt.keywords ? `キーワード: ${prompt.keywords.join(', ')}` : ''}
${prompt.tone ? `トーン: ${prompt.tone}` : ''}
${prompt.length ? `文字数: 約${prompt.length}文字` : ''}

記事の構成:
1. 魅力的なタイトル
2. 導入部分
3. 本文（見出しを使って構造化）
4. まとめ

タイトルと本文を分けて出力してください。`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const fullContent = data.choices[0].message.content;
    const lines = fullContent.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    const content = lines.slice(1).join('\n').trim();

    return { title, content };
  }

  // ===== Gemini（Proxy経由） =====
  private async callGemini(prompt: GenerationPrompt) {
    // Gemini APIはCORS制限があるため、バックエンドプロキシを経由
    const response = await fetch('/.netlify/functions/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `
以下のトピックについて、SEOに最適化された日本語のブログ記事を書いてください。

トピック: ${prompt.topic}
${prompt.keywords ? `キーワード: ${prompt.keywords.join(', ')}` : ''}
${prompt.tone ? `トーン: ${prompt.tone}` : ''}
${prompt.length ? `文字数: 約${prompt.length}文字` : ''}

記事の構成:
1. 魅力的なタイトル
2. 導入部分
3. 本文（見出しを使って構造化）
4. まとめ

タイトルと本文を分けて出力してください。`,
        apiKey: this.config.apiKey,
        model: 'models/gemini-1.5-pro'
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Proxy API error: ${response.status}`);
    }

    const data = await response.json();
    const fullContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const lines = fullContent.split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '')?.trim() || '無題';
    const content = lines.slice(1).join('\n').trim();

    return { title, content };
  }

  // ===== Claude =====
  private async callClaude(prompt: GenerationPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `以下のトピックについて、SEOに最適化された日本語のブログ記事を書いてください。

トピック: ${prompt.topic}
${prompt.keywords ? `キーワード: ${prompt.keywords.join(', ')}` : ''}
${prompt.tone ? `トーン: ${prompt.tone}` : ''}
${prompt.length ? `文字数: 約${prompt.length}文字` : ''}

記事の構成:
1. 魅力的なタイトル
2. 導入部分
3. 本文（見出しを使って構造化）
4. まとめ

タイトルと本文を分けて出力してください。`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const fullContent = data.content[0].text;
    const lines = fullContent.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    const content = lines.slice(1).join('\n').trim();

    return { title, content };
  }

  // ===== Fallback =====
  private generateMockArticle(prompt: GenerationPrompt) {
    const title = `${prompt.topic}について知っておくべき重要なポイント`;
    const content = `
# ${title}

## はじめに

${prompt.topic}は現代社会において重要な話題となっています。この記事では、${prompt.topic}について詳しく解説し、実践的な情報をお届けします。
`;
    const excerpt = this.generateExcerpt(content);
    const keywords = this.extractKeywords(content, prompt.topic);
    const seoScore = this.calculateSEOScore(title, content, keywords);
    const readingTime = this.calculateReadingTime(content);

    return { title, content, excerpt, keywords, seoScore, readingTime };
  }

  // ===== Utility =====
  private generateExcerpt(content: string): string {
    const cleanContent = content.replace(/^#+\s+/gm, '').trim();
    const firstParagraph = cleanContent.split('\n\n')[0];
    return firstParagraph.length > 150 
      ? firstParagraph.substring(0, 150) + '...'
      : firstParagraph;
  }

  private extractKeywords(content: string, topic: string): string[] {
    const keywords = [topic];
    const words = content.toLowerCase().match(/[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      if (word.length > 2) wordCount[word] = (wordCount[word] || 0) + 1;
    });
    const sortedWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
    return [...new Set([...keywords, ...sortedWords])];
  }

  private calculateSEOScore(title: string, content: string, keywords: string[]): number {
    let score = 0;
    if (title.length >= 30 && title.length <= 60) score += 20;
    else if (title.length >= 20 && title.length <= 80) score += 10;
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 500) score += 30;
    else if (wordCount >= 300) score += 20;
    else if (wordCount >= 200) score += 10;
    const contentLower = content.toLowerCase();
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword.toLowerCase())) score += 10;
    });
    const headerCount = (content.match(/^#+\s+/gm) || []).length;
    if (headerCount >= 3) score += 20;
    else if (headerCount >= 2) score += 10;
    return Math.min(score, 100);
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}
