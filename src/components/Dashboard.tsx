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
import { WordPressService } from '../services/wordPressService';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface WordPressPost {
  id: number;
  date: string;
  status: string;
  title: { rendered: string };
  link: string;
}

export const Dashboard: React.FC = () => {
  const { wordPressConfigs, isGenerating } = useAppStore();
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedToday: 0,
    draftArticles: 0,
    scheduledArticles: 0
  });
  const [recentPosts, setRecentPosts] = useState<WordPressPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWordPressStats();
  }, [wordPressConfigs]);

  const loadWordPressStats = async () => {
    if (wordPressConfigs.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const wordPressService = new WordPressService();
      await wordPressService.loadActiveConfig();

      const result = await wordPressService.getAllPosts({
        status: 'any',
        per_page: 100
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const publishedToday = result.posts.filter(post =>
        post.status === 'publish' && new Date(post.date) >= today
      ).length;

      const draftArticles = result.posts.filter(post =>
        post.status === 'draft'
      ).length;

      const scheduledArticles = result.posts.filter(post =>
        post.status === 'future'
      ).length;

      setStats({
        totalArticles: result.total,
        publishedToday,
        draftArticles,
        scheduledArticles
      });

      setRecentPosts(result.posts.slice(0, 5));
    } catch (error) {
      console.error('WordPress統計取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

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
              <p className="text-sm font-medium text-gray-600">下書き</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.draftArticles}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">WordPress統計</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">総記事数</span>
              <span className="text-sm text-gray-600">{stats.totalArticles}記事</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">公開済み</span>
              <span className="text-sm text-green-600">{stats.totalArticles - stats.draftArticles - stats.scheduledArticles}記事</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">下書き</span>
              <span className="text-sm text-yellow-600">{stats.draftArticles}記事</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">予約投稿</span>
              <span className="text-sm text-blue-600">{stats.scheduledArticles}記事</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Articles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">最近の記事（WordPress）</h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : wordPressConfigs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">WordPress設定が必要です</p>
              <p className="text-sm text-gray-400">設定ページでWordPress接続を設定してください</p>
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">記事がまだありません</p>
              <p className="text-sm text-gray-400">AI生成で最初の記事を作成しましょう</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{stripHtml(post.title.rendered)}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{format(new Date(post.date), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        WordPressで表示
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      post.status === 'publish' ? 'text-green-600 bg-green-100' :
                      post.status === 'draft' ? 'text-yellow-600 bg-yellow-100' :
                      post.status === 'future' ? 'text-blue-600 bg-blue-100' :
                      'text-gray-600 bg-gray-100'
                    }`}>
                      {post.status === 'publish' ? '公開済み' :
                       post.status === 'draft' ? '下書き' :
                       post.status === 'future' ? '予約済み' : post.status}
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