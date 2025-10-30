import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Calendar, Tag, TrendingUp, Trash2, Edit, Eye, ExternalLink, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { WordPressService } from '../services/wordPressService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface WordPressPost {
  id: number;
  date: string;
  modified: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  status: string;
  link: string;
  categories: number[];
}

export const ArticlesList: React.FC = () => {
  const { wordPressConfigs } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('any');
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<WordPressPost | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);

  useEffect(() => {
    loadPosts();
  }, [statusFilter, searchTerm, wordPressConfigs]);

  const loadPosts = async () => {
    if (wordPressConfigs.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const wordPressService = new WordPressService();
      await wordPressService.loadActiveConfig();

      const params: any = {
        status: statusFilter,
        per_page: 100,
        orderby: 'date',
        order: 'desc'
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      const result = await wordPressService.getAllPosts(params);
      setPosts(result.posts);
      setTotalPosts(result.total);
    } catch (error) {
      console.error('記事の読み込みエラー:', error);
      toast.error('記事の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = async (postId: number, title: string) => {
    if (!confirm(`「${title}」をWordPressから削除しますか？`)) return;

    try {
      const wordPressService = new WordPressService();
      await wordPressService.loadActiveConfig();

      const success = await wordPressService.deletePost(postId);
      if (success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        toast.success('記事を削除しました');
      } else {
        toast.error('記事の削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      toast.error('削除中にエラーが発生しました');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-800', label: '下書き' },
      publish: { color: 'bg-green-100 text-green-800', label: '公開済み' },
      future: { color: 'bg-blue-100 text-blue-800', label: '予約済み' },
      private: { color: 'bg-yellow-100 text-yellow-800', label: '非公開' },
      pending: { color: 'bg-orange-100 text-orange-800', label: '承認待ち' }
    };

    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            WordPress記事一覧
          </h2>
          <p className="text-gray-600 mt-1">
            WordPressに投稿された記事の管理と閲覧
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={loadPosts}
            className="btn-secondary flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            更新
          </button>
          <div className="text-sm text-gray-600">
            合計: <span className="font-semibold text-gray-900">{totalPosts}</span> 件
          </div>
        </div>
      </div>

      {wordPressConfigs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">WordPress設定が必要</h3>
          </div>
          <p className="text-yellow-800 text-sm mt-2">
            記事を表示するには、WordPress設定ページで投稿先を設定してください。
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="記事を検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="any">すべてのステータス</option>
              <option value="publish">公開済み</option>
              <option value="draft">下書き</option>
              <option value="future">予約済み</option>
              <option value="private">非公開</option>
              <option value="pending">承認待ち</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">記事を読み込み中...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">記事がありません</h3>
              <p className="text-gray-600">AI記事生成から新しい記事を作成してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1">
                          {stripHtml(post.title.rendered)}
                        </h3>
                        {getStatusBadge(post.status)}
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {stripHtml(post.excerpt.rendered)}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(post.date), 'yyyy/MM/dd HH:mm')}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
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
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setSelectedPost(post)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="プレビュー"
                      >
                        <Eye className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleDeletePost(post.id, stripHtml(post.title.rendered))}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">記事プレビュー</h3>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {stripHtml(selectedPost.title.rendered)}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {getStatusBadge(selectedPost.status)}
                  <span>{format(new Date(selectedPost.date), 'yyyy/MM/dd HH:mm')}</span>
                  <a
                    href={selectedPost.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    WordPressで表示
                  </a>
                </div>
              </div>

              {selectedPost.excerpt.rendered && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div
                    className="text-gray-700 italic"
                    dangerouslySetInnerHTML={{ __html: selectedPost.excerpt.rendered }}
                  />
                </div>
              )}

              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedPost.content.rendered }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
