import React, { useState } from 'react';
import { Zap, Save, TestTube, Settings, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AIConfig } from '../types';
import toast from 'react-hot-toast';

export const AIConfigComponent: React.FC = () => {
  const { aiConfig, setAIConfig } = useAppStore();
  const [config, setConfig] = useState<AIConfig>(aiConfig || {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 4000,
    imageGenerationEnabled: true,
    imageProvider: 'dalle3'
  });

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = () => {
    if (!config.apiKey.trim()) {
      toast.error('APIキーを入力してください');
      return;
    }

    setAIConfig(config);
    toast.success('AI設定を保存しました');
  };

  const handleTestConnection = async () => {
    if (!config.apiKey.trim()) {
      toast.error('APIキーを入力してください');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      // Test API connection with a simple request
      const testPrompt = "こんにちは";
      
      if (config.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 10,
          }),
        });
        
        if (response.ok) {
          setConnectionStatus('success');
          toast.success('OpenAI API接続テスト成功！');
        } else {
          const error = await response.json();
          setConnectionStatus('error');
          toast.error(`OpenAI API接続エラー: ${error.error?.message || 'Unknown error'}`);
        }
      } else if (config.provider === 'claude') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: testPrompt }],
          }),
        });
        
        if (response.ok) {
          setConnectionStatus('success');
          toast.success('Claude API接続テスト成功！');
        } else {
          const error = await response.json();
          setConnectionStatus('error');
          toast.error(`Claude API接続エラー: ${error.error?.message || 'Unknown error'}`);
        }
      } else if (config.provider === 'gemini') {
        const modelName = config.model || 'gemini-2.5-flash';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: testPrompt }] }],
              generationConfig: { maxOutputTokens: 10 },
            }),
          }
        );
        
        if (response.ok) {
          setConnectionStatus('success');
          toast.success('Gemini API接続テスト成功！');
        } else {
          const error = await response.json();
          setConnectionStatus('error');
          toast.error(`Gemini API接続エラー: ${error.error?.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error(`接続テストでエラーが発生しました: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const getModelOptions = () => {
    switch (config.provider) {
      case 'openai':
        return [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ];
      case 'claude':
        return [
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
          { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
        ];
      case 'gemini':
        return [
          { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (推奨)' },
          { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
          { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
        ];
      default:
        return [];
    }
  };

  const getImageProviderOptions = () => {
    return [
      { value: 'dalle3', label: 'DALL-E 3 (OpenAI)' },
      { value: 'midjourney', label: 'Midjourney' },
      { value: 'stable-diffusion', label: 'Stable Diffusion' }
    ];
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Zap className="w-8 h-8 text-yellow-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI設定</h2>
          <p className="text-gray-600">記事生成と画像生成に使用するAIサービスを設定します</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">AI プロバイダー設定</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AIプロバイダー
            </label>
            <select
              value={config.provider}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                provider: e.target.value as any,
                model: e.target.value === 'openai' ? 'gpt-4' :
                       e.target.value === 'claude' ? 'claude-3-5-sonnet-20241022' : 'gemini-2.5-flash'
              }))}
              className="input-field"
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Anthropic Claude</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              APIキー
            </label>
            <div className="relative">
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="あなたのAPIキーを入力してください"
                className="input-field pr-10"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {getConnectionStatusIcon()}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              APIキーは安全に暗号化されて保存されます
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              モデル
            </label>
            <select
              value={config.model}
              onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
              className="input-field"
            >
              {getModelOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature ({config.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>保守的</span>
                <span>創造的</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大トークン数
              </label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                min="1000"
                max="8000"
                className="input-field"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Image Generation Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Image className="w-5 h-5" />
          <span>画像生成設定</span>
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.imageGenerationEnabled || false}
                onChange={(e) => setConfig(prev => ({ ...prev, imageGenerationEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">画像自動生成を有効にする</span>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              記事にアイキャッチ画像と記事内画像を自動生成します
            </p>
          </div>

          {config.imageGenerationEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                画像生成プロバイダー
              </label>
              <select
                value={config.imageProvider || 'dalle3'}
                onChange={(e) => setConfig(prev => ({ ...prev, imageProvider: e.target.value as any }))}
                className="input-field"
              >
                {getImageProviderOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                画像生成には追加のAPIキーが必要な場合があります
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleTestConnection}
          disabled={testingConnection || !config.apiKey.trim()}
          className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
        >
          {testingConnection ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              <span>テスト中...</span>
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4" />
              <span>接続テスト</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleSave}
          className="btn-primary flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>設定を保存</span>
        </button>
      </div>

      {/* Provider Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border-2 ${config.provider === 'openai' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
          <h4 className="font-semibold text-gray-900 mb-2">OpenAI</h4>
          <p className="text-sm text-gray-600 mb-3">
            GPT-4とDALL-E 3を使用した高品質な記事・画像生成
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 自然な日本語生成</li>
            <li>• 技術記事に最適</li>
            <li>• 高品質な画像生成</li>
            <li>• 豊富なモデル選択肢</li>
          </ul>
        </div>

        <div className={`p-6 rounded-xl border-2 ${config.provider === 'claude' ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-white'}`}>
          <h4 className="font-semibold text-gray-900 mb-2">Anthropic Claude</h4>
          <p className="text-sm text-gray-600 mb-3">
            安全性と正確性を重視した記事生成
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 長文記事に適している</li>
            <li>• 論理的な構成</li>
            <li>• 安全な出力</li>
            <li>• 最新のClaude 3.5 Sonnet</li>
          </ul>
        </div>

        <div className={`p-6 rounded-xl border-2 ${config.provider === 'gemini' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <h4 className="font-semibold text-gray-900 mb-2">Google Gemini</h4>
          <p className="text-sm text-gray-600 mb-3">
            Googleの最新AI技術による記事生成
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 最新情報の活用</li>
            <li>• 多言語対応</li>
            <li>• 高速な生成</li>
            <li>• Gemini 1.5 Pro対応</li>
          </ul>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">
          <Settings className="w-5 h-5 inline mr-2" />
          APIキーの取得方法
        </h3>
        <div className="text-sm text-yellow-800 space-y-3">
          {config.provider === 'openai' && (
            <div>
              <p className="font-medium">OpenAI API キー:</p>
              <p>1. <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a> にアクセス</p>
              <p>2. アカウントを作成またはログイン</p>
              <p>3. API Keys セクションで新しいキーを作成</p>
              <p>4. 作成されたキーをコピーして上記に貼り付け</p>
              {config.imageGenerationEnabled && (
                <p className="mt-2 font-medium text-blue-800">
                  ※ 画像生成にはDALL-E 3 APIへのアクセスが必要です
                </p>
              )}
            </div>
          )}
          
          {config.provider === 'claude' && (
            <div>
              <p className="font-medium">Anthropic API キー:</p>
              <p>1. <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a> にアクセス</p>
              <p>2. アカウントを作成またはログイン</p>
              <p>3. API Keys で新しいキーを作成</p>
              <p>4. 作成されたキーをコピーして上記に貼り付け</p>
              <p className="mt-2 font-medium text-purple-800">
                ※ Claude 3.5 Sonnetは最新で最も高性能なモデルです
              </p>
            </div>
          )}
          
          {config.provider === 'gemini' && (
            <div className="space-y-3">
              <div>
                <p className="font-medium mb-2">📝 Google AI API キーの取得方法:</p>
                <div className="space-y-1.5 ml-4">
                  <p>1. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 underline font-medium">Google AI Studio</a> にアクセス</p>
                  <p>2. Googleアカウントでログイン（個人・法人どちらでも可）</p>
                  <p>3. 「Get API Key」または「Create API key」ボタンをクリック</p>
                  <p>4. 既存のGoogle Cloudプロジェクトを選択、または新規作成</p>
                  <p>5. 生成されたAPIキーをコピー（<code className="bg-gray-100 px-1 rounded">AIzaSy...</code> で始まる文字列）</p>
                  <p>6. 上記のAPIキーフィールドに貼り付け</p>
                </div>
              </div>

              <div className="border-t border-green-200 pt-3">
                <p className="font-medium mb-2">✨ モデルの選択（2025年最新版）:</p>
                <div className="space-y-1 ml-4 text-sm">
                  <p><strong>Gemini 2.5 Flash</strong>（推奨）: 最速で低コスト、ほとんどのタスクに最適</p>
                  <p className="text-xs text-gray-600 ml-4">→ モデル名: <code className="bg-gray-100 px-1 rounded">gemini-2.5-flash</code></p>
                  <p><strong>Gemini 2.5 Pro</strong>: 最高品質、複雑な推論タスクに最適</p>
                  <p className="text-xs text-gray-600 ml-4">→ モデル名: <code className="bg-gray-100 px-1 rounded">gemini-2.5-pro</code></p>
                  <p><strong>Gemini 2.0 Flash</strong>: 次世代機能搭載、バランス型</p>
                  <p className="text-xs text-gray-600 ml-4">→ モデル名: <code className="bg-gray-100 px-1 rounded">gemini-2.0-flash</code></p>
                  <p className="text-xs text-orange-600 mt-2">⚠️ Gemini 1.5シリーズは廃止されました</p>
                </div>
              </div>

              <div className="border-t border-green-200 pt-3">
                <p className="font-medium mb-2">💡 推奨設定:</p>
                <div className="space-y-1 ml-4 text-sm">
                  <p>• <strong>Temperature</strong>: 0.7（バランス重視）</p>
                  <p>• <strong>Max Tokens</strong>: 4000（標準的な記事長）</p>
                  <p>• より長い記事の場合は8000に増やすことも可能</p>
                </div>
              </div>

              <div className="border-t border-green-200 pt-3">
                <p className="font-medium mb-2">⚠️ トラブルシューティング:</p>
                <div className="space-y-1 ml-4 text-sm">
                  <p><strong>「API key not valid」エラー</strong>: APIキーをコピペ時にスペースや改行が含まれていないか確認</p>
                  <p><strong>「Model not found」エラー</strong>: Gemini 1.5は廃止されました。Gemini 2.5またはGemini 2.0モデルを選択してください</p>
                  <p><strong>「Quota exceeded」エラー</strong>: 無料枠の制限（1分60リクエスト）を超えた可能性あり</p>
                  <p><strong>CORS エラー</strong>: 通常は問題なし。別のブラウザで試してください</p>
                </div>
              </div>

              <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-3">
                <p className="font-medium text-green-900">💰 料金について:</p>
                <p className="text-sm text-green-800 mt-1">
                  <strong>無料枠</strong>: 1分60リクエスト、1日1,500リクエストまで無料<br/>
                  <strong>有料</strong>: Gemini 1.5 Flash は非常に低コスト（$0.000075/1,000文字）<br/>
                  詳細は <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer" className="underline">Google AI 価格ページ</a> を参照
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Usage Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          API使用上の注意
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• APIキーは第三者と共有しないでください</p>
          <p>• 各プロバイダーの利用規約を確認してください</p>
          <p>• API使用量に応じて料金が発生します</p>
          <p>• 生成される記事の品質は設定したモデルとパラメータに依存します</p>
          <p>• 接続テストは少量のトークンを消費します</p>
        </div>
      </div>
    </div>
  );
};