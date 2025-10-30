import React, { useState, useEffect } from 'react';
import { Bot, Settings, Sparkles, FileText, Zap, Search, Filter, TrendingUp, Globe, Send, Edit } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AIService } from '../services/aiService';
import { WordPressService } from '../services/wordPressService';
import { GenerationPrompt, Article, ArticleTopic, TrendAnalysisResult } from '../types';
import { articleTopics } from '../data/articleTopics';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import { customTopicsService } from '../services/customTopicsService';

// 最新AI設定をSupabaseから取得
async function fetchActiveAIConfig() {
  const { data, error } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('AI設定の取得に失敗しました:', error.message);
    return null;
  }
  return data;
}


export const AIGenerator: React.FC = () => {
  const { aiConfig, addArticle, setIsGenerating, isGenerating, wordPressConfigs, updateArticle } = useAppStore();
  const [selectedTopic, setSelectedTopic] = useState<ArticleTopic | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [prompt, setPrompt] = useState<GenerationPrompt>({
    topic: '',
    keywords: [],
    tone: 'professional',
    length: 'long',
    includeIntroduction: true,
    includeConclusion: true,
    includeSources: true,
    useTrendData: false
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [generatedArticle, setGeneratedArticle] = useState<any>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showTopicSelection, setShowTopicSelection] = useState(true);
  const [trendData, setTrendData] = useState<TrendAnalysisResult | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedWordPressConfig, setSelectedWordPressConfig] = useState<string>('');
  const [publishStatus, setPublishStatus] = useState<'publish' | 'draft'>('publish');
  const [recentTopics, setRecentTopics] = useState<any[]>([]);
  const [favoriteTopics, setFavoriteTopics] = useState<any[]>([]);
  const [showCustomTopicHistory, setShowCustomTopicHistory] = useState(false);

  useEffect(() => {
    async function loadAIConfig() {
      try {
        const { data, error } = await supabase
          .from('ai_configs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('AI設定の取得に失敗しました:', error.message);
          return;
        }

        if (data) {
          const mapped = {
            provider: data.provider,
            apiKey: data.api_key,
            model: data.model,
            temperature: data.temperature ?? 0.7,
            maxTokens: data.max_tokens ?? 4000,
          };

          useAppStore.setState({ aiConfig: mapped });
          console.log('✅ SupabaseからAI設定をロードしました:', mapped);
        }
      } catch (err) {
        console.error('AI設定ロード中のエラー:', err);
      }
    }

    loadAIConfig();
    loadCustomTopics();
  }, []);

  const loadCustomTopics = async () => {
    try {
      const [recent, favorites] = await Promise.all([
        customTopicsService.getAllTopics('recent', 10),
        customTopicsService.getFavoriteTopics()
      ]);
      setRecentTopics(recent);
      setFavoriteTopics(favorites);
    } catch (error) {
      console.error('カスタムトピックの読み込みエラー:', error);
    }
  };

  const handleSelectCustomTopic = async (topic: any) => {
    setPrompt({
      topic: topic.topicName,
      keywords: topic.keywords || [],
      tone: topic.tone || 'professional',
      length: topic.length || 'long',
      includeIntroduction: true,
      includeConclusion: true,
      includeSources: true,
      useTrendData: false
    });
    setShowTopicSelection(false);
    setShowCustomTopicHistory(false);

    await customTopicsService.incrementUseCount(topic.id);
    await loadCustomTopics();
    toast.success(`「${topic.topicName}」を選択しました`);
  };

  const handleToggleFavorite = async (topicId: string) => {
    await customTopicsService.toggleFavorite(topicId);
    await loadCustomTopics();
  };


  
  // Check for pending trend data on component mount
  useEffect(() => {
    const pendingTrendData = localStorage.getItem('pendingTrendData');
    if (pendingTrendData) {
      try {
        const parsedTrendData = JSON.parse(pendingTrendData);
        setTrendData(parsedTrendData);
        setPrompt(prev => ({
          ...prev,
          topic: parsedTrendData.keyword,
          keywords: [parsedTrendData.keyword, ...parsedTrendData.relatedKeywords.slice(0, 4)],
          useTrendData: true,
          trendAnalysis: parsedTrendData
        }));
        setShowTopicSelection(false);
        localStorage.removeItem('pendingTrendData');
        toast.success('トレンドデータを記事生成に適用しました');
      } catch (error) {
        console.error('トレンドデータの読み込みエラー:', error);
        localStorage.removeItem('pendingTrendData');
      }
    }
  }, []);

  // Set default WordPress config
  useEffect(() => {
    if (wordPressConfigs.length > 0 && !selectedWordPressConfig) {
      const activeConfig = wordPressConfigs.find(config => config.isActive);
      if (activeConfig) {
        setSelectedWordPressConfig(activeConfig.id);
      } else {
        setSelectedWordPressConfig(wordPressConfigs[0].id);
      }
    }
  }, [wordPressConfigs, selectedWordPressConfig]);

  // Filter topics based on search and category
  const filteredTopics = articleTopics.filter(topic => {
    const matchesSearch = topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(articleTopics.map(topic => topic.category)))];

  const handleTopicSelect = (topic: ArticleTopic) => {
    setSelectedTopic(topic);
    setPrompt(prev => ({
      ...prev,
      topicId: topic.id,
      topic: topic.name,
      keywords: [...topic.defaultKeywords]
    }));
    setShowTopicSelection(false);
  };

  const handleKeywordAdd = () => {
    if (keywordInput.trim() && !prompt.keywords.includes(keywordInput.trim())) {
      setPrompt(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const handleKeywordRemove = (keyword: string) => {
    setPrompt(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

const handleGenerate = async () => {
  if (!aiConfig) {
    toast.error('AI設定を完了してください');
    return;
  }

  // トピック未入力チェック
  if (!prompt.topic.trim()) {
    toast.error('記事のトピックを入力してください');
    return;
  }

  try {
    setIsGenerating(true);
    const aiService = new AIService();

    console.log("🔍 渡されるaiConfig:", aiConfig);


    // 🔹 ここで最新のpromptを「ローカル変数」として固定
    const generationPrompt: GenerationPrompt = {
      topic: prompt.topic,
      keywords: [...prompt.keywords],
      tone: prompt.tone,
      length: prompt.length,
      includeIntroduction: prompt.includeIntroduction,
      includeConclusion: prompt.includeConclusion,
      includeSources: prompt.includeSources,
      useTrendData: prompt.useTrendData || false,
    };

    toast.loading('AI記事を生成中...', { duration: 2000 });

    // 🔹 ローカル変数を明示的に渡す
    const result = await aiService.generateArticle(generationPrompt);

    setGeneratedArticle(result);
    setIsPreview(true);
    toast.success('記事が生成されました！');
  } catch (error) {
    console.error('記事生成エラー:', error);
    toast.error('記事生成に失敗しました');
  } finally {
    setIsGenerating(false);
  }
};

  
  const handleSaveArticle = async () => {
    if (!generatedArticle || !selectedWordPressConfig) {
      toast.error('WordPress設定が選択されていません');
      return;
    }

    const wordPressConfig = wordPressConfigs.find(config => config.id === selectedWordPressConfig);
    if (!wordPressConfig) {
      toast.error('選択されたWordPress設定が見つかりません');
      return;
    }

    try {
      setIsPublishing(true);

      const article: Article = {
        id: '',
        title: generatedArticle.title,
        content: generatedArticle.content,
        excerpt: generatedArticle.excerpt || '',
        keywords: generatedArticle.keywords || prompt.keywords,
        category: selectedTopic?.category || trendData?.keyword || 'AI技術',
        status: 'draft',
        tone: prompt.tone,
        length: prompt.length,
        aiProvider: aiConfig?.provider || '',
        aiModel: aiConfig?.model || '',
        seoScore: generatedArticle.seoScore || 0,
        readingTime: generatedArticle.readingTime || 0,
        wordCount: generatedArticle.content?.length || 0,
        trendData: trendData || {},
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const wordPressService = new WordPressService();
      await wordPressService.loadActiveConfig();

      toast.loading('WordPress下書き保存中...', { duration: 3000 });

      const publishResult = await wordPressService.publishArticle(article, 'draft');

      if (publishResult.success) {
        if (prompt.topic && !selectedTopic) {
          await customTopicsService.findOrCreateTopic(prompt.topic, {
            keywords: prompt.keywords,
            tone: prompt.tone,
            length: prompt.length,
            category: article.category
          });
        }

        toast.success(`記事「${article.title}」をWordPressに下書き保存しました！`);

        setGeneratedArticle(null);
        setIsPreview(false);
        setShowTopicSelection(true);
        setSelectedTopic(null);
        setTrendData(null);

        setPrompt({
          topic: '',
          keywords: [],
          tone: 'professional',
          length: 'long',
          includeIntroduction: true,
          includeConclusion: true,
          includeSources: true,
          useTrendData: false
        });
      } else {
        toast.error(`WordPress下書き保存に失敗しました: ${publishResult.error}`);
      }
    } catch (error) {
      console.error('WordPress下書き保存エラー:', error);
      toast.error('WordPress下書き保存でエラーが発生しました');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishToWordPress = async () => {
    if (!generatedArticle || !selectedWordPressConfig) {
      toast.error('記事またはWordPress設定が選択されていません');
      return;
    }

    const wordPressConfig = wordPressConfigs.find(config => config.id === selectedWordPressConfig);
    if (!wordPressConfig) {
      toast.error('選択されたWordPress設定が見つかりません');
      return;
    }

    try {
      setIsPublishing(true);

      const article: Article = {
        id: '',
        title: generatedArticle.title,
        content: generatedArticle.content,
        excerpt: generatedArticle.excerpt || '',
        keywords: generatedArticle.keywords || prompt.keywords,
        category: selectedTopic?.category || trendData?.keyword || 'AI技術',
        status: publishStatus === 'publish' ? 'published' : 'draft',
        tone: prompt.tone,
        length: prompt.length,
        aiProvider: aiConfig?.provider || '',
        aiModel: aiConfig?.model || '',
        seoScore: generatedArticle.seoScore || 0,
        readingTime: generatedArticle.readingTime || 0,
        wordCount: generatedArticle.content?.length || 0,
        trendData: trendData || {},
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const wordPressService = new WordPressService();
      await wordPressService.loadActiveConfig();

      const statusText = publishStatus === 'publish' ? 'WordPress投稿中...' : 'WordPress下書き保存中...';
      toast.loading(statusText, { duration: 3000 });

      const publishResult = await wordPressService.publishArticle(article, publishStatus);

      if (publishResult.success) {
        if (prompt.topic && !selectedTopic) {
          await customTopicsService.findOrCreateTopic(prompt.topic, {
            keywords: prompt.keywords,
            tone: prompt.tone,
            length: prompt.length,
            category: article.category
          });
        }

        const successMessage = publishStatus === 'publish'
          ? `記事「${article.title}」を${wordPressConfig.name}に公開しました！`
          : `記事「${article.title}」を${wordPressConfig.name}に下書き保存しました！`;

        toast.success(successMessage);

        setGeneratedArticle(null);
        setIsPreview(false);
        setShowTopicSelection(true);
        setSelectedTopic(null);
        setTrendData(null);

        setPrompt({
          topic: '',
          keywords: [],
          tone: 'professional',
          length: 'long',
          includeIntroduction: true,
          includeConclusion: true,
          includeSources: true,
          useTrendData: false
        });
      } else {
        toast.error(`WordPress投稿に失敗しました: ${publishResult.error}`);
      }
    } catch (error) {
      console.error('WordPress投稿エラー:', error);
      toast.error('WordPress投稿でエラーが発生しました');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBackToTopics = () => {
    setShowTopicSelection(true);
    setSelectedTopic(null);
    setTrendData(null);
    setPrompt({
      topic: '',
      keywords: [],
      tone: 'professional',
      length: 'long',
      includeIntroduction: true,
      includeConclusion: true,
      includeSources: true,
      useTrendData: false
    });
  };

  if (isPreview && generatedArticle) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">生成された記事</h2>
              <p className="text-gray-600">記事をプレビューして保存または投稿してください</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsPreview(false)}
              className="btn-secondary"
            >
              戻る
            </button>
            <button
              onClick={handleSaveArticle}
              disabled={!selectedWordPressConfig}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              WordPress下書き保存
            </button>
          </div>
        </div>

        {/* WordPress Publishing Section */}
        {wordPressConfigs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>WordPress投稿</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  投稿先WordPress
                </label>
                <select
                  value={selectedWordPressConfig}
                  onChange={(e) => setSelectedWordPressConfig(e.target.value)}
                  className="input-field"
                >
                  {wordPressConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} {config.isActive && '(メイン)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  投稿状態
                </label>
                <select
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(e.target.value as 'publish' | 'draft')}
                  className="input-field"
                >
                  <option value="publish">公開</option>
                  <option value="draft">下書き</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handlePublishToWordPress}
                  disabled={isPublishing || !selectedWordPressConfig}
                  className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{publishStatus === 'publish' ? '投稿中...' : '保存中...'}</span>
                    </>
                  ) : (
                    <>
                      {publishStatus === 'publish' ? (
                        <Send className="w-4 h-4" />
                      ) : (
                        <Edit className="w-4 h-4" />
                      )}
                      <span>{publishStatus === 'publish' ? 'WordPressに公開' : 'WordPressに下書き保存'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              publishStatus === 'publish' 
                ? 'border-green-200 bg-green-50' 
                : 'border-blue-200 bg-blue-50'
            }`}>
              <p className={`text-sm ${
                publishStatus === 'publish' ? 'text-green-800' : 'text-blue-800'
              }`}>
                {publishStatus === 'publish' 
                  ? '記事は即座にWordPressに公開され、読者が閲覧できる状態になります。'
                  : '記事はWordPressに下書きとして保存され、管理画面から手動で公開できます。'
                }
              </p>
            </div>
          </div>
        )}

        {wordPressConfigs.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900">WordPress設定が必要</h3>
            </div>
            <p className="text-yellow-800 text-sm mt-2">
              記事をWordPressに投稿するには、WordPress設定ページで投稿先を設定してください。
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {generatedArticle.title}
              </h1>
              <div className="prose prose-lg max-w-none">
                <div 
                  className="whitespace-pre-wrap text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: generatedArticle.content }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">記事情報</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">文字数</label>
                  <p className="text-lg font-semibold text-blue-600">
                    {generatedArticle.content.length.toLocaleString()}文字
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">読了時間</label>
                  <p className="text-lg font-semibold text-green-600">
                    約{generatedArticle.readingTime}分
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">SEOスコア</label>
                  <p className="text-lg font-semibold text-purple-600">
                    {generatedArticle.seoScore}点
                  </p>
                </div>
              </div>
            </div>

            {trendData && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>トレンドデータ</span>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">トレンドスコア</label>
                    <p className="text-lg font-semibold text-blue-600">
                      {trendData.trendScore}/100
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">月間検索数</label>
                    <p className="text-lg font-semibold text-green-600">
                      {trendData.searchVolume.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">競合度</label>
                    <p className={`text-lg font-semibold ${
                      trendData.competition === 'low' ? 'text-green-600' :
                      trendData.competition === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {trendData.competition.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">キーワード</h3>
              <div className="flex flex-wrap gap-2">
                {generatedArticle.keywords.map((keyword: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">記事概要</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {generatedArticle.excerpt}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showTopicSelection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Bot className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">記事トピック選択</h2>
            <p className="text-gray-600">生成したい記事のトピックを選択してください</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="トピックを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'すべてのカテゴリ' : category}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowCustomTopicHistory(!showCustomTopicHistory)}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              履歴から選択
            </button>
          </div>

          {showCustomTopicHistory && (recentTopics.length > 0 || favoriteTopics.length > 0) && (
            <div className="border-t pt-4 space-y-4">
              {favoriteTopics.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-yellow-500">★</span>
                    お気に入り
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {favoriteTopics.map(topic => (
                      <div
                        key={topic.id}
                        className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                      >
                        <button
                          onClick={() => handleSelectCustomTopic(topic)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-gray-900">{topic.topicName}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {topic.useCount}回使用 ・ {topic.keywords.length}キーワード
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(topic.id);
                          }}
                          className="ml-2 text-yellow-500 hover:text-yellow-600"
                        >
                          ★
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentTopics.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">最近使用したトピック</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {recentTopics.map(topic => (
                      <div
                        key={topic.id}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <button
                          onClick={() => handleSelectCustomTopic(topic)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-gray-900 text-sm">{topic.topicName}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {topic.useCount}回使用
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(topic.id);
                          }}
                          className={`ml-2 ${topic.isFavorite ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
                        >
                          ★
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Topic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              onClick={() => handleTopicSelect(topic)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {topic.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                    {topic.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      {topic.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {topic.defaultKeywords.length}個のキーワード
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">該当するトピックが見つかりません</h3>
            <p className="text-gray-600">検索条件を変更してお試しください</p>
          </div>
        )}

        {/* Custom Topic Option */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">カスタムトピック</h3>
              <p className="text-gray-600">独自のトピックで記事を生成したい場合</p>
            </div>
            <button
              onClick={() => setShowTopicSelection(false)}
              className="btn-primary flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>カスタム作成</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI記事生成</h2>
            <p className="text-gray-600">
              {selectedTopic ? `選択中: ${selectedTopic.name}` : 
               trendData ? `トレンド分析: ${trendData.keyword}` : 
               'AIを使って高品質な記事を自動生成します'}
            </p>
          </div>
        </div>
        <button
          onClick={handleBackToTopics}
          className="btn-secondary"
        >
          トピック選択に戻る
        </button>
      </div>

      {!aiConfig && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800 font-medium">
              AI設定が必要です。設定ページでAPIキーを設定してください。
            </p>
          </div>
        </div>
      )}

      {/* Trend Data Display */}
      {trendData && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">トレンドデータを活用した記事生成</h3>
              <p className="text-blue-800 text-sm mb-3">
                キーワード「{trendData.keyword}」のトレンド分析結果を記事生成に活用します
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-600">トレンドスコア</div>
                  <div className="text-lg font-bold text-blue-600">{trendData.trendScore}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-600">月間検索数</div>
                  <div className="text-lg font-bold text-green-600">{trendData.searchVolume.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-600">競合度</div>
                  <div className={`text-lg font-bold ${
                    trendData.competition === 'low' ? 'text-green-600' :
                    trendData.competition === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {trendData.competition.toUpperCase()}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-600">SEO機会</div>
                  <div className="text-lg font-bold text-purple-600">{trendData.seoData.opportunity}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTopic && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">{selectedTopic.name}</h3>
              <p className="text-blue-800 text-sm mb-3">{selectedTopic.description}</p>
              <div className="flex flex-wrap gap-2">
                {selectedTopic.defaultKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">記事生成設定</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                記事のトピック
              </label>
              <input
                type="text"
                value={prompt.topic}
                onChange={(e) => setPrompt(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="例: 機械学習の最新動向"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                キーワード
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleKeywordAdd()}
                  placeholder="キーワードを入力"
                  className="input-field"
                />
                <button
                  onClick={handleKeywordAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {prompt.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center space-x-1"
                  >
                    <span>{keyword}</span>
                    <button
                      onClick={() => handleKeywordRemove(keyword)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文章のトーン
              </label>
              <select
                value={prompt.tone}
                onChange={(e) => setPrompt(prev => ({ ...prev, tone: e.target.value as any }))}
                className="input-field"
              >
                <option value="professional">プロフェッショナル</option>
                <option value="casual">カジュアル</option>
                <option value="technical">技術的</option>
                <option value="friendly">親しみやすい</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                記事の長さ
              </label>
              <select
                value={prompt.length}
                onChange={(e) => setPrompt(prev => ({ ...prev, length: e.target.value as any }))}
                className="input-field"
              >
                <option value="short">短い (1,000-2,000文字)</option>
                <option value="medium">中程度 (2,000-4,000文字)</option>
                <option value="long">長い (4,000-6,000文字)</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                含める要素
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={prompt.includeIntroduction}
                    onChange={(e) => setPrompt(prev => ({ ...prev, includeIntroduction: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">導入部分</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={prompt.includeConclusion}
                    onChange={(e) => setPrompt(prev => ({ ...prev, includeConclusion: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">まとめ</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={prompt.includeSources}
                    onChange={(e) => setPrompt(prev => ({ ...prev, includeSources: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">参考文献</span>
                </label>
                {trendData && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={prompt.useTrendData}
                      onChange={(e) => setPrompt(prev => ({ ...prev, useTrendData: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">トレンドデータを活用</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">生成プレビュー</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">予想される記事構成</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {prompt.includeIntroduction && <li>• はじめに</li>}
                <li>• {prompt.topic}の基本概念</li>
                <li>• 技術的な詳細</li>
                <li>• 実際の応用事例</li>
                <li>• 課題と解決策</li>
                <li>• 最新トレンドと将来展望</li>
                {prompt.includeConclusion && <li>• まとめ</li>}
                {prompt.includeSources && <li>• 参考文献</li>}
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">生成設定</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>トーン: {prompt.tone === 'professional' ? 'プロフェッショナル' : 
                           prompt.tone === 'casual' ? 'カジュアル' : 
                           prompt.tone === 'technical' ? '技術的' : '親しみやすい'}</p>
                <p>長さ: {prompt.length === 'short' ? '短い' : 
                         prompt.length === 'medium' ? '中程度' : '長い'}</p>
                <p>キーワード数: {prompt.keywords.length}個</p>
                {trendData && prompt.useTrendData && (
                  <p>トレンドデータ: 活用中</p>
                )}
              </div>
            </div>

            {trendData && prompt.useTrendData && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">トレンド最適化</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>• 話題性の高いキーワードを活用</p>
                  <p>• 競合分析に基づく差別化</p>
                  <p>• SEO最適化された構成</p>
                  <p>• ユーザーの検索意図に対応</p>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !aiConfig || !prompt.topic.trim()}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>記事を生成</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};