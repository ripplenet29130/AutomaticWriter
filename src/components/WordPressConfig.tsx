import React, { useState } from 'react';
import { Globe, Plus, Check, X, Settings, TestTube, Calendar, Clock, FileText, Edit, TrendingUp, Search, Lightbulb, Target, Users, Hash } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { WordPressConfig, WordPressService } from '../services/wordPressService';
import { ScheduleSettings } from '../types';
import toast from 'react-hot-toast';

export const WordPressConfigComponent: React.FC = () => {
  const { wordPressConfigs = [], addWordPressConfig, updateWordPressConfig, deleteWordPressConfig } = useAppStore();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [testingConfig, setTestingConfig] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [newConfig, setNewConfig] = useState({
    name: '',
    url: '',
    username: '',
    applicationPassword: '',
    defaultCategory: ''
  });

  const handleAddConfig = () => {
    if (!newConfig.name || !newConfig.url || !newConfig.username || !newConfig.applicationPassword) {
      toast.error('すべての必須フィールドを入力してください');
      return;
    }

    const config: WordPressConfig = {
      id: `wp-${Date.now()}`,
      ...newConfig,
      isActive: (wordPressConfigs || []).length === 0, // First config is active by default
      scheduleSettings: {
        frequency: 'daily' as const,
        time: '09:00',
        timezone: 'Asia/Tokyo',
        isActive: false,
        targetKeywords: [], // Changed from selectedTitles to targetKeywords
        publishStatus: 'publish',
        titleGenerationCount: 10
      }
    };

    addWordPressConfig(config);
    setNewConfig({
      name: '',
      url: '',
      username: '',
      applicationPassword: '',
      defaultCategory: ''
    });
    setIsAddingNew(false);
    toast.success('WordPress設定を追加しました');
  };

  const handleTestConnection = async (config: WordPressConfig) => {
    setTestingConfig(config.id);
    try {
      const service = new WordPressService(config);
      const isConnected = await service.testConnection();
      
      if (isConnected) {
        toast.success('WordPress接続テスト成功！');
      } else {
        toast.error('WordPress接続に失敗しました。設定を確認してください。');
      }
    } catch (error) {
      toast.error('接続テストでエラーが発生しました');
    } finally {
      setTestingConfig(null);
    }
  };

  const handleSetActive = (configId: string) => {
    // Deactivate all configs first
    (wordPressConfigs || []).forEach(config => {
      updateWordPressConfig(config.id, { isActive: false });
    });
    
    // Activate selected config
    updateWordPressConfig(configId, { isActive: true });
    toast.success('メインのWordPress設定を変更しました');
  };

  const handleDeleteConfig = (configId: string) => {
    if (window.confirm('この設定を削除してもよろしいですか？')) {
      deleteWordPressConfig(configId);
      toast.success('WordPress設定を削除しました');
    }
  };

  const handleUpdateSchedule = (configId: string, scheduleSettings: ScheduleSettings) => {
    updateWordPressConfig(configId, { scheduleSettings });
    setEditingSchedule(null);
    toast.success('投稿スケジュールを更新しました');
  };

  const getPublishStatusText = (publishStatus: string) => {
    return publishStatus === 'publish' ? '公開' : '下書き';
  };

  const getPublishStatusColor = (publishStatus: string) => {
    return publishStatus === 'publish' ? 'text-green-600' : 'text-blue-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Globe className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">WordPress設定</h2>
            <p className="text-gray-600">投稿先のWordPressサイトを設定・管理します（キーワードベース自動投稿対応）</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsAddingNew(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>新規追加</span>
        </button>
      </div>

      {/* Add New Configuration */}
      {isAddingNew && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">新しいWordPress設定</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                設定名 *
              </label>
              <input
                type="text"
                value={newConfig.name}
                onChange={(e) => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="メインサイト"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WordPress URL *
              </label>
              <input
                type="url"
                value={newConfig.url}
                onChange={(e) => setNewConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ユーザー名 *
              </label>
              <input
                type="text"
                value={newConfig.username}
                onChange={(e) => setNewConfig(prev => ({ ...prev, username: e.target.value }))}
                placeholder="WordPressユーザー名"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アプリケーションパスワード *
              </label>
              <input
                type="password"
                value={newConfig.applicationPassword}
                onChange={(e) => setNewConfig(prev => ({ ...prev, applicationPassword: e.target.value }))}
                placeholder="WordPress アプリケーションパスワード"
                className="input-field"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                デフォルトカテゴリ（スラッグまたは名前）
              </label>
              <input
                type="text"
                value={newConfig.defaultCategory}
                onChange={(e) => setNewConfig(prev => ({ ...prev, defaultCategory: e.target.value }))}
                placeholder="ai-technology または AI技術"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                WordPressの既存カテゴリのスラッグまたはカテゴリ名を入力してください（新しいカテゴリは作成されません）
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setIsAddingNew(false)}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button
              onClick={handleAddConfig}
              className="btn-primary"
            >
              設定を追加
            </button>
          </div>
        </div>
      )}

      {/* Configuration List */}
      <div className="space-y-4">
        {(wordPressConfigs || []).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">WordPress設定がありません</h3>
            <p className="text-gray-600 mb-4">
              記事を自動投稿するためのWordPress設定を追加してください
            </p>
            <button
              onClick={() => setIsAddingNew(true)}
              className="btn-primary"
            >
              最初の設定を追加
            </button>
          </div>
        ) : (
          (wordPressConfigs || []).map((config) => (
            <div
              key={config.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
                config.isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    config.isActive ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Globe className={`w-5 h-5 ${config.isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span>{config.name}</span>
                      {config.isActive && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          メイン設定
                        </span>
                      )}
                      {config.scheduleSettings?.isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          スケジュール有効
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600">{config.url}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTestConnection(config)}
                    disabled={testingConfig === config.id}
                    className="btn-secondary flex items-center space-x-1 disabled:opacity-50"
                  >
                    {testingConfig === config.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>テスト中</span>
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4" />
                        <span>接続テスト</span>
                      </>
                    )}
                  </button>
                  
                  {!config.isActive && (
                    <button
                      onClick={() => handleSetActive(config.id)}
                      className="btn-primary flex items-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>メインに設定</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteConfig(config.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
                <div>
                  <span className="text-gray-500">ユーザー名</span>
                  <p className="font-medium text-gray-900">{config.username}</p>
                </div>
                <div>
                  <span className="text-gray-500">デフォルトカテゴリ</span>
                  <p className="font-medium text-gray-900">{config.defaultCategory || '未設定'}</p>
                </div>
                <div>
                  <span className="text-gray-500">状態</span>
                  <p className={`font-medium ${config.isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                    {config.isActive ? 'メイン設定' : '追加設定'}
                  </p>
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>キーワードベース自動投稿</span>
                  </h4>
                  <button
                    onClick={() => setEditingSchedule(editingSchedule === config.id ? null : config.id)}
                    className="btn-secondary flex items-center space-x-1"
                  >
                    <Settings className="w-4 h-4" />
                    <span>設定</span>
                  </button>
                </div>

                {config.scheduleSettings && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">頻度</span>
                      <p className="font-medium text-gray-900">
                        {config.scheduleSettings.frequency === 'daily' ? '毎日' :
                         config.scheduleSettings.frequency === 'weekly' ? '毎週' :
                         config.scheduleSettings.frequency === 'biweekly' ? '隔週' : '毎月'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">時刻</span>
                      <p className="font-medium text-gray-900">{config.scheduleSettings.time}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">投稿状態</span>
                      <p className={`font-medium ${getPublishStatusColor(config.scheduleSettings.publishStatus || 'publish')}`}>
                        {getPublishStatusText(config.scheduleSettings.publishStatus || 'publish')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">対象キーワード</span>
                      <p className="font-medium text-gray-900">
                        {(config.scheduleSettings.targetKeywords || []).length}個
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">スケジュール状態</span>
                      <p className={`font-medium ${config.scheduleSettings.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                        {config.scheduleSettings.isActive ? '有効' : '無効'}
                      </p>
                    </div>
                  </div>
                )}

                {editingSchedule === config.id && (
                  <ScheduleEditor
                    config={config}
                    onSave={(scheduleSettings) => handleUpdateSchedule(config.id, scheduleSettings)}
                    onCancel={() => setEditingSchedule(null)}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          <Settings className="w-5 h-5 inline mr-2" />
          WordPressアプリケーションパスワードの取得方法
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>1. WordPressの管理画面にログインします</p>
          <p>2. 「ユーザー」→「プロフィール」に移動します</p>
          <p>3. 「アプリケーションパスワード」セクションを見つけます</p>
          <p>4. 新しいアプリケーション名（例：「AI記事投稿」）を入力します</p>
          <p>5. 「新しいアプリケーションパスワードを追加」をクリックします</p>
          <p>6. 生成されたパスワードをコピーして上記フィールドに貼り付けます</p>
        </div>
        
        <div className="mt-4 p-4 bg-blue-100 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">🎯 キーワードベース自動投稿について</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>キーワード設定</strong>：各WordPress設定で対象キーワードを設定します</li>
            <li>• <strong>自動トレンド分析</strong>：投稿時に選択されたキーワードでトレンド分析を実行</li>
            <li>• <strong>最適タイトル生成</strong>：ユーザーニーズの高いタイトルを自動生成・選択</li>
            <li>• <strong>独立したキーワード管理</strong>：各設定で使用済みキーワードを個別に管理</li>
            <li>• <strong>循環システム</strong>：全キーワード使用後は自動的にリセット</li>
            <li>• <strong>複数サイト対応</strong>：複数のWordPressサイトに異なるキーワードで投稿</li>
          </ul>
        </div>
      </div>

      {/* New Feature Highlight */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">
          🚀 新機能：キーワードベース自動記事生成
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-green-800 mb-2">従来の方式</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• 事前にタイトルを選択</li>
              <li>• 固定されたタイトルで投稿</li>
              <li>• 手動でタイトル管理が必要</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">新しい方式</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• キーワードを設定するだけ</li>
              <li>• 毎回トレンド分析を実行</li>
              <li>• 最新のユーザーニーズに対応</li>
              <li>• 自動的に最適なタイトルを生成</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ScheduleEditorProps {
  config: WordPressConfig;
  onSave: (scheduleSettings: ScheduleSettings) => void;
  onCancel: () => void;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ config, onSave, onCancel }) => {
  const { updateWordPressConfig } = useAppStore();
  
  // 関数形式の初期化でデフォルト値と既存設定をマージ
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(() => {
    const defaultSettings: ScheduleSettings = {
      frequency: 'daily',
      time: '09:00',
      timezone: 'Asia/Tokyo',
      isActive: false,
      targetKeywords: [], // 必ず配列として初期化
      publishStatus: 'publish',
      titleGenerationCount: 10 // 必ず数値として初期化
    };
    
    // 既存のconfig.scheduleSettingsとデフォルト設定をマージ
    return { ...defaultSettings, ...config.scheduleSettings };
  });

  const [keywordInput, setKeywordInput] = useState('');

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !scheduleSettings.targetKeywords.includes(keywordInput.trim())) {
      const newKeywords = [...scheduleSettings.targetKeywords, keywordInput.trim()];
      const newScheduleSettings = {
        ...scheduleSettings,
        targetKeywords: newKeywords
      };
      
      setScheduleSettings(newScheduleSettings);
      
      // Immediately update the store to persist the keywords
      updateWordPressConfig(config.id, {
        scheduleSettings: newScheduleSettings
      });
      
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const newKeywords = scheduleSettings.targetKeywords.filter(k => k !== keyword);
    const newScheduleSettings = {
      ...scheduleSettings,
      targetKeywords: newKeywords
    };
    
    setScheduleSettings(newScheduleSettings);
    
    // Immediately update the store
    updateWordPressConfig(config.id, {
      scheduleSettings: newScheduleSettings
    });
  };

  const handleSave = () => {
    onSave(scheduleSettings);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投稿頻度
          </label>
          <select
            value={scheduleSettings.frequency}
            onChange={(e) => setScheduleSettings(prev => ({ 
              ...prev, 
              frequency: e.target.value as 'daily' | 'weekly' | 'monthly' 
            }))}
            className="input-field"
          >
            <option value="daily">毎日</option>
            <option value="weekly">毎週</option>
            <option value="biweekly">隔週</option>
            <option value="monthly">毎月</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投稿時刻
          </label>
          <input
            type="time"
            value={scheduleSettings.time}
            onChange={(e) => setScheduleSettings(prev => ({ ...prev, time: e.target.value }))}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投稿状態
          </label>
          <select
            value={scheduleSettings.publishStatus || 'publish'}
            onChange={(e) => setScheduleSettings(prev => ({ 
              ...prev, 
              publishStatus: e.target.value as 'publish' | 'draft' 
            }))}
            className="input-field"
          >
            <option value="publish">公開</option>
            <option value="draft">下書き</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            タイトル生成数
          </label>
          <input
            type="number"
            min="5"
            max="20"
            value={scheduleSettings.titleGenerationCount || 10}
            onChange={(e) => setScheduleSettings(prev => ({ 
              ...prev, 
              titleGenerationCount: parseInt(e.target.value) 
            }))}
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">
            キーワードから生成するタイトル候補数
          </p>
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={scheduleSettings.isActive}
            onChange={(e) => setScheduleSettings(prev => ({ ...prev, isActive: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">キーワードベース自動投稿を有効にする</span>
        </label>
      </div>

      {/* Keyword Management Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Hash className="w-5 h-5 text-blue-500" />
            <span>対象キーワード設定</span>
          </h5>
          <span className="text-sm text-gray-600">
            設定中: {scheduleSettings.targetKeywords.length}個
          </span>
        </div>

        {/* Keyword Input */}
        <div className="mb-6">
          <div className="flex space-x-3">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
              placeholder="キーワードを入力（例：AI技術、AGA治療、自伝執筆）"
              className="input-field flex-1"
            />
            <button
              onClick={handleAddKeyword}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>追加</span>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            各キーワードで自動的にトレンド分析を行い、最適なタイトルで記事を生成します
          </p>
        </div>

        {/* Keywords List */}
        {scheduleSettings.targetKeywords.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {scheduleSettings.targetKeywords.map((keyword, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Hash className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-900">{keyword}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {scheduleSettings.targetKeywords.length === 0 && (
          <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
            <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h6 className="text-lg font-medium text-gray-900 mb-2">キーワードを追加</h6>
            <p className="text-gray-600">
              自動投稿で使用するキーワードを追加してください
            </p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h6 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
          <Lightbulb className="w-4 h-4" />
          <span>キーワードベース自動投稿の仕組み</span>
        </h6>
        <div className="text-sm text-blue-800 space-y-2">
          <div className="flex items-start space-x-2">
            <span className="font-semibold">1.</span>
            <span>設定されたキーワードから1つをランダムに選択</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">2.</span>
            <span>選択されたキーワードでリアルタイムトレンド分析を実行</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">3.</span>
            <span>ユーザーニーズの高いタイトルを{scheduleSettings.titleGenerationCount || 10}個生成</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">4.</span>
            <span>最もスコアの高いタイトルを自動選択</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">5.</span>
            <span>選択されたタイトルでAI記事を生成・投稿</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">6.</span>
            <span>使用済みキーワードは次回選択されない（全て使用後にリセット）</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="btn-secondary"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          className="btn-primary"
        >
          設定を保存
        </button>
      </div>
    </div>
  );
};