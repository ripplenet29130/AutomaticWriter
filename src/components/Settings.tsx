import React from 'react';
import { Settings } from 'lucide-react';

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">設定機能</h3>
        <p className="text-gray-600">
          基本的な設定機能です。必要に応じて機能を追加できます。
        </p>
      </div>
    </div>
  );
};