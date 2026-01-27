/**
 * BeryllMonitoringPage.tsx
 * 
 * Страница мониторинга серверов Beryll
 * Положить в: src/pages/Beryll/BeryllMonitoringPage.tsx
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import { MonitoringDashboard } from "src/components/beryll/MonitoringDashboard";
import { BERYLL_ROUTE } from "src/utils/consts";

const BeryllMonitoringPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Заголовок */}
      <div className="bg-white shadow">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {/* Кнопка назад */}
              <button
                onClick={() => navigate(BERYLL_ROUTE)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Назад к серверам"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Мониторинг серверов</h1>
                <p className="text-sm text-gray-500">Статус и доступность серверов в реальном времени</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-full mx-auto p-4 sm:p-6 lg:p-8">
        <MonitoringDashboard 
          autoRefresh={true} 
          refreshInterval={60} 
        />
      </div>
    </div>
  );
};

export default BeryllMonitoringPage;