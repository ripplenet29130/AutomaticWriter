import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  FileText, 
  Calendar, 
  CheckCircle,
  Clock,
  AlertCircle,
  Bot
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const Dashboard: React.FC = () => {
  const { articles = [], isGenerating } = useAppStore();
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedToday: 0,
    scheduledArticles: 0,
    averageSeoScore: 0,
    totalReadingTime: 0
  });

  useEffect(() => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const publishedToday = (articles || []).filter(article => 
        article.publishedAt && new Date(article.publishedAt) >= today
      ).length;

      const scheduledArticles = (articles || []).filter(article => 
        article.status === 'scheduled'
      ).length;

      const seoScores = (articles || [])
        .filter(article => article.seoScore)
        .map(article => article.seoScore!);
      
      const averageSeoScore = seoScores.length > 0 
        ? Math.round(seoScores.reduce((sum, score) => sum + score, 0) / seoScores.length)
        : 0;

      const totalReadingTime = (articles || [])
        .filter(article => article.readingTime)
        .reduce((sum, article) => sum + (article.readingTime || 0), 0);

      setStats({
        totalArticles: (articles || []).length,
        publishedToday,
        scheduledArticles,
        averageSeoScore,
        totalReadingTime
      });
    } catch (error) {
      console.error('Stats calculation error:', error);
      setStats({
        totalArticles: 0,
        publishedToday: 0,
        scheduledArticles: 0,
        averageSeoScore: 0,
        totalReadingTime: 0
      });
    }
  }, [articles]);

  const recentArticles = (articles || [])
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-600 bg-green-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'draft': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return '投稿済み';
      case 'scheduled': return '予約投稿';
      case 'draft': return '下書き';
      case 'failed': return '投稿失敗';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総記事数</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalArticles}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">今日の投稿</p>
              <p className="text-3xl font-bold text-green-600">{stats.publishedToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">予約投稿</p>
              <p className="text-3xl font-bold text-blue-600">{stats.scheduledArticles}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均SEOスコア</p>
              <p className="text-3xl font-bold text-purple-600">{stats.averageSeoScore}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">システム状態</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bot className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">AI記事生成</span>
              </div>
              <div className="flex items-center space-x-2">
                {isGenerating ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-yellow-600">実行中</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">待機中</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">自動スケジューラー</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">有効</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">次回実行予定</span>
              </div>
              <span className="text-sm text-gray-600">明日 09:00</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">統計情報</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">総読了時間</span>
              <span className="text-sm text-gray-600">{stats.totalReadingTime}分</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">平均記事長</span>
              <span className="text-sm text-gray-600">5,000文字</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">成功率</span>
              <span className="text-sm text-green-600">98.5%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">月間記事数</span>
              <span className="text-sm text-gray-600">30記事</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Articles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">最近の記事</h3>
        </div>
        <div className="p-6">
          {recentArticles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">記事がまだありません</p>
              <p className="text-sm text-gray-400">AI生成で最初の記事を作成しましょう</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentArticles.map((article) => (
                <div key={article.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{article.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {article.createdAt && (
                        <span>{format(new Date(article.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>
                      )}
                      <span>{(article.keywords || []).slice(0, 3).join(', ')}</span>
                      {article.seoScore && (
                        <span>SEO: {article.seoScore}点</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
                      {getStatusText(article.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};