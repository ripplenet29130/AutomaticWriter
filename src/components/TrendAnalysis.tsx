import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  BarChart3, 
  Target, 
  Lightbulb,
  Globe,
  Users,
  Zap,
  RefreshCw,
  Eye,
  Award,
  AlertCircle,
  Key
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { hybridTrendAnalysisService } from '../services/hybridTrendAnalysisService';
import { TrendAnalysisResult, KeywordSuggestion } from '../types';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';

export const TrendAnalysis: React.FC = () => {
  const { setActiveView } = useAppStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [trendData, setTrendData] = useState<TrendAnalysisResult | null>(null);
  const [keywordSuggestions, setKeywordSuggestions] = useState<KeywordSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'competitors' | 'seo'>('overview');
  const [apiStatus, setApiStatus] = useState<any>(null);

  useEffect(() => {
    // API設定状態をチェック
    const status = hybridTrendAnalysisService.getApiStatus();
    setApiStatus(status);
  }, []);

  const handleAnalyze = async () => {
    if (!searchKeyword.trim()) {
      toast.error('キーワードを入力してください');
      return;
    }

    setIsAnalyzing(true);
    try {
      toast.loading('トレンド分析中...', { duration: 2000 });
      
      const [analysis, suggestions] = await Promise.all([
        hybridTrendAnalysisService.analyzeTrends(searchKeyword),
        hybridTrendAnalysisService.getKeywordSuggestions(searchKeyword, 15)
      ]);

      setTrendData(analysis);
      setKeywordSuggestions(suggestions);
      
      if (apiStatus?.usingMockData) {
        toast.success('トレンド分析が完了しました（モックデータ使用）');
      } else {
        toast.success('トレンド分析が完了しました');
      }
    } catch (error) {
      toast.error('トレンド分析に失敗しました');
      console.error('トレンド分析エラー:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateArticleWithTrends = () => {
    if (!trendData) return;
    
    // AI生成ページに移動し、トレンドデータを渡す
    setActiveView('generator');
    // トレンドデータをローカルストレージに保存（一時的）
    localStorage.setItem('pendingTrendData', JSON.stringify(trendData));
    toast.success('トレンドデータを記事生成に活用します');
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising': return 'text-green-600';
      case 'stable': return 'text-blue-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <TrendingUp className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">トレンド分析</h2>
          <p className="text-gray-600">リアルタイムトレンドデータで記事の話題性を最大化</p>
        </div>
      </div>

      {/* API Status Warning */}
      {apiStatus?.usingMockData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">API設定が未完了</h3>
              <p className="text-sm text-yellow-800">
                現在はモックデータを使用しています。実際のトレンドデータを取得するにはAPI設定が必要です。
              </p>
            </div>
            <button
              onClick={() => setActiveView('api-setup')}
              className="btn-secondary flex items-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>API設定</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">キーワード分析</h3>
        
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="分析したいキーワードを入力..."
              className="input-field"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>分析中...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>分析開始</span>
              </>
            )}
          </button>
        </div>
      </div>

      {trendData && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">トレンドスコア</p>
                  <p className="text-3xl font-bold text-blue-600">{trendData.trendScore}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">月間検索数</p>
                  <p className="text-3xl font-bold text-green-600">{formatNumber(trendData.searchVolume)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">競合度</p>
                  <p className={`text-3xl font-bold ${getCompetitionColor(trendData.competition).split(' ')[0]}`}>
                    {trendData.competition.toUpperCase()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">SEO機会</p>
                  <p className="text-3xl font-bold text-orange-600">{trendData.seoData.opportunity}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">トレンドデータを活用した記事生成</h3>
                <p className="text-gray-600">分析結果を基に、話題性の高い記事を自動生成します</p>
              </div>
              <button
                onClick={generateArticleWithTrends}
                className="btn-primary flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>記事生成に活用</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: '概要', icon: BarChart3 },
                  { id: 'keywords', label: 'キーワード', icon: Search },
                  { id: 'competitors', label: '競合分析', icon: Users },
                  { id: 'seo', label: 'SEO分析', icon: Target }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Hot Topics */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <span>話題のトピック</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {trendData.hotTopics.map((topic, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Geographic Data */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-blue-500" />
                      <span>地域別関心度</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {trendData.userInterest.geographicData.slice(0, 8).map((geo, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">{geo.region}</span>
                            <span className="text-sm text-blue-600 font-semibold">{geo.formattedValue}</span>
                          </div>
                          <div className="mt-2 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${geo.value}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rising Queries */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">急上昇クエリ</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">上昇中</h5>
                        <div className="space-y-2">
                          {trendData.userInterest.risingQueries.map((query, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-gray-700">{query}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">ブレイクアウト</h5>
                        <div className="space-y-2">
                          {trendData.userInterest.breakoutQueries.map((query, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Zap className="w-4 h-4 text-orange-500" />
                              <span className="text-sm text-gray-700">{query}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'keywords' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">関連キーワード提案</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              キーワード
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              検索数
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              競合度
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              トレンド
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CPC
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {keywordSuggestions.map((suggestion, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {suggestion.keyword}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatNumber(suggestion.searchVolume)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCompetitionColor(suggestion.competition)}`}>
                                  {suggestion.competition}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-medium ${getTrendColor(suggestion.trend)}`}>
                                  {suggestion.trend}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ¥{suggestion.cpc}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">関連キーワード</h4>
                    <div className="flex flex-wrap gap-2">
                      {trendData.relatedKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium cursor-pointer hover:bg-blue-200 transition-colors"
                          onClick={() => setSearchKeyword(keyword)}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'competitors' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">競合記事分析</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-900">{trendData.competitorAnalysis.topArticles.length}</div>
                        <div className="text-sm text-gray-600">分析記事数</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-900">{formatNumber(trendData.competitorAnalysis.averageLength)}</div>
                        <div className="text-sm text-gray-600">平均文字数</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-900">{trendData.competitorAnalysis.commonTopics.length}</div>
                        <div className="text-sm text-gray-600">共通トピック</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {trendData.competitorAnalysis.topArticles.map((article, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-900">{article.title}</h5>
                            <span className="text-sm text-gray-500">{formatNumber(article.wordCount)}文字</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{article.metaDescription}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{article.domain}</span>
                            {article.publishDate && (
                              <span>{article.publishDate.toLocaleDateString('ja-JP')}</span>
                            )}
                          </div>
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {article.headings.slice(0, 3).map((heading, hIndex) => (
                                <span key={hIndex} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                  {heading}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">共通トピック</h4>
                    <div className="flex flex-wrap gap-2">
                      {trendData.competitorAnalysis.commonTopics.map((topic, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <Target className="w-5 h-5 text-red-500" />
                        <span>SEO難易度</span>
                      </h4>
                      <div className="text-3xl font-bold text-red-600 mb-2">{trendData.seoData.difficulty}/100</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-red-500 h-3 rounded-full"
                          style={{ width: `${trendData.seoData.difficulty}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <Award className="w-5 h-5 text-green-500" />
                        <span>SEO機会</span>
                      </h4>
                      <div className="text-3xl font-bold text-green-600 mb-2">{trendData.seoData.opportunity}/100</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full"
                          style={{ width: `${trendData.seoData.opportunity}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <span>SEO改善提案</span>
                    </h4>
                    <div className="space-y-3">
                      {trendData.seoData.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-yellow-800">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!trendData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">トレンド分析を開始</h3>
          <p className="text-gray-600 mb-6">
            キーワードを入力して、リアルタイムのトレンドデータと競合分析を取得しましょう
          </p>
          <div className="max-w-md mx-auto">
            <div className="flex space-x-4">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="例: AI技術, AGA治療, 自伝執筆"
                className="input-field"
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="btn-primary flex items-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>分析</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};