import React from 'react';
import { Settings, Database } from 'lucide-react';
import { DataMigration } from './DataMigration';

export const SettingsComponent: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="w-8 h-8 text-gray-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">設定</h2>
          <p className="text-gray-600">システム設定を管理します</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">データ移行</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          ローカルストレージからSupabaseデータベースへの記事移行
        </p>
        <DataMigration />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">その他の設定</h3>
        <p className="text-gray-600">
          必要に応じて追加の設定機能を実装できます
        </p>
      </div>
    </div>
  );
};