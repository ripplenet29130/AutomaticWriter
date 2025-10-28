import { TitleSuggestion, TrendAnalysisResult } from '../types';

interface TitleFeatures {
  hasKeyword: boolean;
  hasNumbers: boolean;
  isConcise: boolean;
  solvesProblems: boolean;
  hasAuthority: boolean;
  isCatchy: boolean;
  hasDifferentiation: boolean;
  length: number;
  pattern: string; // パターン識別子を追加
}

export class TitleGenerationService {
  private usedPatterns: Set<string> = new Set(); // 使用済みパターンを追跡
  
  async generateTitleSuggestions(
    trendAnalysis: TrendAnalysisResult,
    count: number = 20
  ): Promise<TitleSuggestion[]> {
    try {
      const suggestions: TitleSuggestion[] = [];
      const keyword = trendAnalysis.keyword;
      
      // 多様性を確保するためのパターン生成
      const titlePatterns = this.generateDiverseTitlePatterns(keyword, trendAnalysis);

      // パターンの多様性を強制的に確保
      const diversePatterns = this.ensurePatternDiversity(titlePatterns, count);

      // 指定された数だけタイトル提案を生成
      for (let i = 0; i < Math.min(count, diversePatterns.length); i++) {
        const titleData = diversePatterns[i];
        
        suggestions.push({
          id: `title-${i + 1}`,
          title: titleData.title,
          keyword,
          description: this.generateDescription(titleData.title, keyword, trendAnalysis),
          trendScore: this.calculateTitleTrendScore(titleData.title, trendAnalysis),
          searchVolume: this.estimateTitleSearchVolume(titleData.title, trendAnalysis),
          competition: this.assessTitleCompetition(titleData.title, trendAnalysis),
          seoScore: this.calculateAdvancedSEOScore(titleData.title, keyword, titleData.features),
          clickPotential: this.calculateAdvancedClickPotential(titleData.title, titleData.features),
          targetAudience: this.identifyTargetAudience(titleData.title, keyword),
          contentAngle: this.identifyContentAngle(titleData.title),
          relatedKeywords: this.extractRelatedKeywords(titleData.title, trendAnalysis),
          trendAnalysis
        });
      }

      // 多様性を重視したソート（パターンの偏りを防ぐ）
      return this.sortWithDiversity(suggestions);
    } catch (error) {
      console.error('タイトル提案生成エラー:', error);
      return this.generateFallbackTitles(trendAnalysis.keyword, count);
    }
  }

  private generateDiverseTitlePatterns(keyword: string, trendAnalysis: TrendAnalysisResult): Array<{
    title: string;
    features: TitleFeatures;
  }> {
    const patterns: Array<{ title: string; features: TitleFeatures }> = [];

    // 1. 数字 + 実践パターン（具体的な手順）
    const numberPracticalPatterns = [
      `${keyword}で成功する5つの方法`,
      `${keyword}初心者向け7つのステップ`,
      `${keyword}効果を高める8つのコツ`,
      `${keyword}プロが教える10の秘訣`,
      `${keyword}失敗しない4つのポイント`,
      `${keyword}を始める3つの準備`,
      `${keyword}上達のための6つの習慣`,
      `${keyword}で結果を出す9つの法則`
    ];

    numberPracticalPatterns.forEach(title => {
      if (title.length <= 30) {
        patterns.push({
          title,
          features: this.analyzeTitleFeatures(title, keyword, 'number-practical')
        });
      }
    });

    // 2. 疑問解決 + 悩み解消パターン
    const problemSolvingPatterns = [
      `${keyword}の悩みを完全解決`,
      `${keyword}でお困りの方へ`,
      `${keyword}の疑問にプロが回答`,
      `${keyword}初心者の「なぜ？」解決`,
      `${keyword}の不安を解消する方法`,
      `${keyword}トラブル対処法`,
      `${keyword}でよくある失敗と対策`,
      `${keyword}の壁を乗り越える方法`
    ];

    problemSolvingPatterns.forEach(title => {
      if (title.length <= 30) {
        patterns.push({
          title,
          features: this.analyzeTitleFeatures(title, keyword, 'problem-solving')
        });
      }
    });

    // 3. 権威性 + 専門性パターン
    const authorityPatterns = [
      `専門家が語る${keyword}の真実`,
      `プロが実践する${keyword}術`,
      `${keyword}のエキスパートが解説`,
      `現役医師が教える${keyword}`,
      `業界のプロが明かす${keyword}`,
      `${keyword}専門家の実践法`,
      `現場のプロが教える${keyword}`,
      `${keyword}研究者が徹底解説`
    ];

    authorityPatterns.forEach(title => {
      if (title.length <= 30) {
        patterns.push({
          title,
          features: this.analyzeTitleFeatures(title, keyword, 'authority')
        });
      }
    });

    // 4. 最新情報 + トレンドパターン
    const trendPatterns = [
      `${keyword}最新動向2025`,
      `2025年版${keyword}ガイド`,
      `話題の${keyword}を分析`,
      `${keyword}業界の最新情報`,
      `今注目の${keyword}とは`,
      `${keyword}の未来を予測`,
      `急成長中の${keyword}市場`,
      `${keyword}新時代の到来`
    ];

    trendPatterns.forEach(title => {
      if (title.length <= 30) {
        patterns.push({
          title,
          features: this.analyzeTitleFeatures(title, keyword, 'trend')
        });
      }
    });

    // 5. 比較 + 選択支援パターン
    const comparisonPatterns = [
      `${keyword}徹底比較ガイド`,
      `${keyword}の選び方決定版`,
      `${keyword}おすすめランキング`,
      `${keyword}メリット・デメリット`,
      `${keyword}正しい選択基準`,
      `${keyword}比較表で一目瞭然`,
      `${keyword}厳選おすすめリスト`,
      `${keyword}の違いを完全解説`
    ];

    comparisonPatterns.forEach(title => {
      if (title.length <= 30) {
        patterns.push({
          title,
          features: this.analyzeTitleFeatures(title, keyword, 'comparison')
        });
      }
    });

    // 6. 実践 + 体験談パターン
    const experiencePatterns = [
      `${keyword}実践レポート`,
      `${keyword}体験談と学び`,
      `${keyword}実際にやってみた`,
      `${keyword}成功事例を紹介`,
      `${keyword}の効果を検証`,
      `${keyword}実践者の声`,
      `${keyword}リアル体験記`,
      `${keyword}実践から学んだこと`
    ];

    experiencePatterns.forEach(title => {
      if (title.length <= 30) {
        patterns.push({
          title,
          features: this.analyzeTitleFeatures(title, keyword, 'experience')
        });
      }
    });

    // 7. 基礎 + 入門パターン
    const basicPatterns = [
      `${keyword}基礎知識まとめ`,
      `${keyword}入門ガイド`,
      `${keyword}を始める前に`,
      `${keyword}の基本を理解`,
      `${keyword}初心者向け解説`,
      `${keyword}の仕組みを解説`,
      `${keyword}基本のキ`,
      `${keyword}をゼロから学ぶ`
    ];

    basicPatterns.forEach(title => {
      if (title.length <= 30) {
        patterns.push({
          title,
          features: this.analyzeTitleFeatures(title, keyword, 'basic')
        });
      }
    });

    // 8. 応用 + 上級パターン
    const advancedPatterns = [
      `${keyword}上級者向けテクニック`,
      `${keyword}応用活用法`,
      `${keyword}プロレベルの技術`,
      `${keyword}マスターへの道`,
      `${keyword}極める方法`,
      `${keyword}上級テクニック集`,
      `${keyword}プロの裏技`,
      `${keyword}究極の活用術`
    ];

    advancedPatterns.forEach(title => {
      if (title.length <= 30) {
        patterns.push({
          title,
          features: this.analyzeTitleFeatures(title, keyword, 'advanced')
        });
      }
    });

    return patterns;
  }

  private ensurePatternDiversity(patterns: Array<{ title: string; features: TitleFeatures }>, count: number): Array<{ title: string; features: TitleFeatures }> {
    const patternGroups: { [key: string]: Array<{ title: string; features: TitleFeatures }> } = {};
    
    // パターンごとにグループ化
    patterns.forEach(pattern => {
      const patternType = pattern.features.pattern;
      if (!patternGroups[patternType]) {
        patternGroups[patternType] = [];
      }
      patternGroups[patternType].push(pattern);
    });

    const diversePatterns: Array<{ title: string; features: TitleFeatures }> = [];
    const patternTypes = Object.keys(patternGroups);
    const patternsPerType = Math.ceil(count / patternTypes.length);

    // 各パターンタイプから均等に選択
    patternTypes.forEach(patternType => {
      const groupPatterns = patternGroups[patternType];
      const selectedFromGroup = groupPatterns.slice(0, patternsPerType);
      diversePatterns.push(...selectedFromGroup);
    });

    // 不足分を補完
    if (diversePatterns.length < count) {
      const remaining = count - diversePatterns.length;
      const allRemaining = patterns.filter(p => !diversePatterns.includes(p));
      diversePatterns.push(...allRemaining.slice(0, remaining));
    }

    return diversePatterns.slice(0, count);
  }

  private sortWithDiversity(suggestions: TitleSuggestion[]): TitleSuggestion[] {
    // パターンの多様性を考慮したソート
    const patternCounts: { [key: string]: number } = {};
    const sortedSuggestions: TitleSuggestion[] = [];
    const remaining = [...suggestions];

    // 総合スコアでソート
    remaining.sort((a, b) => {
      const scoreA = a.seoScore + a.clickPotential + a.trendScore;
      const scoreB = b.seoScore + b.clickPotential + b.trendScore;
      return scoreB - scoreA;
    });

    // パターンの多様性を確保しながら選択
    while (remaining.length > 0 && sortedSuggestions.length < suggestions.length) {
      let selected = false;
      
      // まず、まだ使用されていないパターンを優先
      for (let i = 0; i < remaining.length; i++) {
        const suggestion = remaining[i];
        const pattern = this.identifyTitlePattern(suggestion.title);
        
        if (!patternCounts[pattern] || patternCounts[pattern] < 2) {
          sortedSuggestions.push(suggestion);
          remaining.splice(i, 1);
          patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
          selected = true;
          break;
        }
      }
      
      // パターンが重複してもスコアの高いものを選択
      if (!selected && remaining.length > 0) {
        const best = remaining.shift()!;
        sortedSuggestions.push(best);
        const pattern = this.identifyTitlePattern(best.title);
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
    }

    return sortedSuggestions;
  }

  private identifyTitlePattern(title: string): string {
    if (/\d+/.test(title) && (/方法|ステップ|コツ|秘訣|ポイント/.test(title))) {
      return 'number-practical';
    }
    if (/悩み|困|疑問|解決|対処|トラブル|不安/.test(title)) {
      return 'problem-solving';
    }
    if (/専門|プロ|エキスパート|現役|業界|医師|研究者/.test(title)) {
      return 'authority';
    }
    if (/最新|トレンド|2025|話題|注目|未来|新時代/.test(title)) {
      return 'trend';
    }
    if (/比較|ランキング|選び方|違い|メリット|おすすめ/.test(title)) {
      return 'comparison';
    }
    if (/実践|体験|やってみた|事例|効果|検証|レポート/.test(title)) {
      return 'experience';
    }
    if (/基礎|入門|初心者|基本|ゼロから|仕組み/.test(title)) {
      return 'basic';
    }
    if (/上級|応用|プロレベル|マスター|極める|究極|裏技/.test(title)) {
      return 'advanced';
    }
    return 'general';
  }

  private analyzeTitleFeatures(title: string, keyword: string, pattern: string): TitleFeatures {
    return {
      hasKeyword: title.includes(keyword),
      hasNumbers: /\d+/.test(title),
      isConcise: title.length <= 30,
      solvesProblems: /悩み|困|疑問|解決|対処|トラブル|不安/.test(title),
      hasAuthority: /専門|プロ|エキスパート|現役|業界|医師/.test(title),
      isCatchy: /必見|完全|徹底|秘訣|革命|話題|注目|急成長/.test(title),
      hasDifferentiation: /vs|比較|ランキング|選び方|違い|メリット/.test(title),
      length: title.length,
      pattern: pattern // パターン識別子を追加
    };
  }

  private calculateAdvancedSEOScore(title: string, keyword: string, features: TitleFeatures): number {
    let score = 50; // ベーススコア

    // 1. キーワードを盛り込む（最重要）
    if (features.hasKeyword) {
      score += 25;
      // キーワードが前半にある場合はボーナス
      if (title.indexOf(keyword) < title.length / 2) {
        score += 5;
      }
    }

    // 2. 簡潔で分かりやすいタイトル（30文字前後）
    if (features.isConcise) {
      score += 15;
      // 理想的な長さ（25-30文字）の場合はボーナス
      if (features.length >= 25 && features.length <= 30) {
        score += 5;
      }
    } else {
      score -= 10; // 長すぎる場合はペナルティ
    }

    // 3. 具体的な数字を入れる
    if (features.hasNumbers) {
      score += 10;
    }

    // 4. 読者の疑問や悩みを解決する
    if (features.solvesProblems) {
      score += 8;
    }

    // 5. 権威性や信頼性をアピール
    if (features.hasAuthority) {
      score += 8;
    }

    // 6. キャッチーな言葉を使う
    if (features.isCatchy) {
      score += 7;
    }

    // 7. ライバル記事との差別化
    if (features.hasDifferentiation) {
      score += 5;
    }

    // 年度情報のボーナス
    if (title.includes('2025')) {
      score += 5;
    }

    // パターンの多様性ボーナス（同じパターンの使用を抑制）
    if (this.usedPatterns.has(features.pattern)) {
      score -= 15; // 既に使用されたパターンはペナルティ
    } else {
      score += 10; // 新しいパターンはボーナス
      this.usedPatterns.add(features.pattern);
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateAdvancedClickPotential(title: string, features: TitleFeatures): number {
    let score = 40; // ベーススコア

    // 数字による具体性
    if (features.hasNumbers) {
      score += 15;
    }

    // 問題解決への期待
    if (features.solvesProblems) {
      score += 12;
    }

    // 権威性による信頼感
    if (features.hasAuthority) {
      score += 10;
    }

    // キャッチーな表現
    if (features.isCatchy) {
      score += 10;
    }

    // 比較・選択支援
    if (features.hasDifferentiation) {
      score += 8;
    }

    // 感情に訴える表現
    const emotionalWords = ['必見', '完全', '徹底', '秘訣', '革命', '驚き', '衝撃', '話題'];
    emotionalWords.forEach(word => {
      if (title.includes(word)) {
        score += 3;
      }
    });

    // 緊急性・希少性
    const urgencyWords = ['今', '最新', '限定', '急', '注目', '話題'];
    urgencyWords.forEach(word => {
      if (title.includes(word)) {
        score += 2;
      }
    });

    // 記号による視覚的インパクト
    if (title.includes('！') || title.includes('？')) {
      score += 3;
    }
    if (title.includes('【') && title.includes('】')) {
      score += 2;
    }

    // パターンの新鮮さボーナス
    if (!this.usedPatterns.has(features.pattern)) {
      score += 8; // 新しいパターンは魅力的
    }

    return Math.min(100, Math.max(0, score));
  }

  private generateFallbackTitles(keyword: string, count: number): TitleSuggestion[] {
    // 多様性を確保したフォールバックタイトル
    const diverseFallbackTitles = [
      `${keyword}基礎知識まとめ`,
      `専門家が語る${keyword}の真実`,
      `${keyword}最新動向2025`,
      `${keyword}で成功する5つの方法`,
      `${keyword}徹底比較ガイド`,
      `${keyword}実践レポート`,
      `${keyword}の悩みを完全解決`,
      `${keyword}上級者向けテクニック`,
      `${keyword}初心者向け解説`,
      `${keyword}効果を検証`
    ];

    return diverseFallbackTitles.slice(0, count).map((title, index) => ({
      id: `fallback-${index + 1}`,
      title,
      keyword,
      description: `${keyword}について、専門家の視点から実践的な情報をお伝えします。`,
      trendScore: 70,
      searchVolume: 10000,
      competition: 'medium' as const,
      seoScore: this.calculateAdvancedSEOScore(title, keyword, this.analyzeTitleFeatures(title, keyword, `fallback-${index}`)),
      clickPotential: this.calculateAdvancedClickPotential(title, this.analyzeTitleFeatures(title, keyword, `fallback-${index}`)),
      targetAudience: '一般ユーザー',
      contentAngle: '総合・包括',
      relatedKeywords: [keyword],
      trendAnalysis: {
        keyword,
        trendScore: 70,
        searchVolume: 10000,
        competition: 'medium' as const,
        relatedKeywords: [keyword],
        hotTopics: [keyword],
        seoData: {
          difficulty: 50,
          opportunity: 70,
          suggestions: []
        },
        competitorAnalysis: {
          topArticles: [],
          averageLength: 3000,
          commonTopics: []
        },
        userInterest: {
          risingQueries: [],
          breakoutQueries: [],
          geographicData: []
        },
        timestamp: new Date()
      }
    }));
  }

  private generateDescription(title: string, keyword: string, trendAnalysis: TrendAnalysisResult): string {
    try {
      const features = this.analyzeTitleFeatures(title, keyword, 'unknown');
      
      if (features.solvesProblems) {
        return `${keyword}でお困りの方に向けて、専門家が実践的な解決策を詳しく解説します。`;
      } else if (features.hasAuthority) {
        return `${keyword}の専門家が、豊富な経験と最新の知見を基に詳しく解説します。`;
      } else if (features.hasDifferentiation) {
        return `${keyword}の選択肢を徹底比較し、あなたに最適な選択をサポートします。`;
      } else if (features.hasNumbers) {
        return `${keyword}について、具体的な数値とデータを用いて分かりやすく解説します。`;
      } else {
        return `${keyword}について、最新のトレンドデータを基に専門家が詳しく解説します。`;
      }
    } catch (error) {
      console.error('説明文生成エラー:', error);
      return `${keyword}について詳しく解説します。`;
    }
  }

  private calculateTitleTrendScore(title: string, trendAnalysis: TrendAnalysisResult): number {
    try {
      let score = trendAnalysis.trendScore || 50;

      // トレンド関連キーワードが含まれている場合はボーナス（2025年対応）
      const trendKeywords = ['2025', '最新', 'トレンド', '話題', '急上昇', 'ブーム', '注目'];
      trendKeywords.forEach(trendKeyword => {
        if (title.includes(trendKeyword)) {
          score += 10;
        }
      });

      // 関連キーワードが含まれている場合もボーナス
      (trendAnalysis.relatedKeywords || []).forEach(relatedKeyword => {
        if (title.includes(relatedKeyword)) {
          score += 5;
        }
      });

      return Math.min(100, score);
    } catch (error) {
      console.error('トレンドスコア計算エラー:', error);
      return 70;
    }
  }

  private estimateTitleSearchVolume(title: string, trendAnalysis: TrendAnalysisResult): number {
    try {
      let baseVolume = trendAnalysis.searchVolume || 10000;
      const features = this.analyzeTitleFeatures(title, trendAnalysis.keyword, 'unknown');

      // タイトルの特徴に基づいて調整
      if (features.solvesProblems) {
        baseVolume *= 1.3; // 問題解決系は高め
      }
      if (features.hasNumbers) {
        baseVolume *= 1.2; // 数字入りは高め
      }
      if (features.hasDifferentiation) {
        baseVolume *= 1.25; // 比較系は高め
      }
      if (title.includes('2025') || title.includes('最新')) {
        baseVolume *= 1.15; // 最新情報は高め
      }

      return Math.floor(baseVolume * (0.8 + Math.random() * 0.4));
    } catch (error) {
      console.error('検索ボリューム推定エラー:', error);
      return 10000;
    }
  }

  private assessTitleCompetition(title: string, trendAnalysis: TrendAnalysisResult): 'low' | 'medium' | 'high' {
    try {
      let competitionLevel = trendAnalysis.competition || 'medium';
      const features = this.analyzeTitleFeatures(title, trendAnalysis.keyword, 'unknown');

      // タイトルの特徴に基づいて調整
      if (features.hasAuthority || features.isCatchy) {
        // 権威性やキャッチーなタイトルは競合が高い
        if (competitionLevel === 'low') competitionLevel = 'medium';
        else if (competitionLevel === 'medium') competitionLevel = 'high';
      }

      if (features.solvesProblems && features.hasNumbers) {
        // 具体的な問題解決は競合が低め
        if (competitionLevel === 'high') competitionLevel = 'medium';
        else if (competitionLevel === 'medium') competitionLevel = 'low';
      }

      return competitionLevel;
    } catch (error) {
      console.error('競合度評価エラー:', error);
      return 'medium';
    }
  }

  private identifyTargetAudience(title: string, keyword: string): string {
    try {
      if (title.includes('初心者') || title.includes('入門') || title.includes('始め方') || title.includes('基礎') || title.includes('ゼロから')) {
        return '初心者・入門者';
      }
      if (title.includes('専門') || title.includes('プロ') || title.includes('上級') || title.includes('エキスパート') || title.includes('マスター')) {
        return '専門家・上級者';
      }
      if (title.includes('ビジネス') || title.includes('企業') || title.includes('経営')) {
        return 'ビジネス関係者';
      }
      if (title.includes('悩み') || title.includes('困') || title.includes('解決')) {
        return '課題を抱える人';
      }
      
      return '一般ユーザー';
    } catch (error) {
      console.error('対象読者識別エラー:', error);
      return '一般ユーザー';
    }
  }

  private identifyContentAngle(title: string): string {
    try {
      if (title.includes('ガイド') || title.includes('解説') || title.includes('入門') || title.includes('マニュアル') || title.includes('基礎')) {
        return '教育・解説';
      }
      if (title.includes('比較') || title.includes('ランキング') || title.includes('選び方') || title.includes('vs')) {
        return '比較・選択支援';
      }
      if (title.includes('最新') || title.includes('トレンド') || title.includes('2025') || title.includes('話題')) {
        return '最新情報・トレンド';
      }
      if (title.includes('方法') || title.includes('活用') || title.includes('実践') || title.includes('使い方')) {
        return '実践・ハウツー';
      }
      if (title.includes('秘訣') || title.includes('真実') || title.includes('実態') || title.includes('専門家')) {
        return '専門知識・深掘り';
      }
      if (title.includes('悩み') || title.includes('解決') || title.includes('対処') || title.includes('困')) {
        return '問題解決';
      }
      if (title.includes('体験') || title.includes('実践') || title.includes('やってみた') || title.includes('レポート')) {
        return '体験・実践';
      }
      if (title.includes('上級') || title.includes('応用') || title.includes('プロレベル') || title.includes('極める')) {
        return '上級・応用';
      }
      
      return '総合・包括';
    } catch (error) {
      console.error('コンテンツ角度識別エラー:', error);
      return '総合・包括';
    }
  }

  private extractRelatedKeywords(title: string, trendAnalysis: TrendAnalysisResult): string[] {
    try {
      const keywords = [trendAnalysis.keyword];
      
      // タイトルから関連キーワードを抽出
      (trendAnalysis.relatedKeywords || []).forEach(keyword => {
        if (title.includes(keyword)) {
          keywords.push(keyword);
        }
      });

      // 急上昇クエリからも抽出
      (trendAnalysis.userInterest?.risingQueries || []).forEach(query => {
        if (title.includes(query)) {
          keywords.push(query);
        }
      });

      // タイトルの特徴に基づいて追加キーワード
      const features = this.analyzeTitleFeatures(title, trendAnalysis.keyword, 'unknown');
      if (features.hasNumbers) keywords.push('具体的');
      if (features.solvesProblems) keywords.push('解決策');
      if (features.hasAuthority) keywords.push('専門家');
      if (features.isCatchy) keywords.push('注目');

      return Array.from(new Set(keywords));
    } catch (error) {
      console.error('関連キーワード抽出エラー:', error);
      return [trendAnalysis.keyword];
    }
  }

  // 使用済みパターンをリセットするメソッド（定期的に呼び出し）
  resetUsedPatterns() {
    this.usedPatterns.clear();
    console.log('使用済みパターンをリセットしました');
  }
}

export const titleGenerationService = new TitleGenerationService();