/**
 * BeryllPage.tsx (обновлённый)
 * 
 * Главная страница APK Beryll с расширенными вкладками:
 * - Серверы (существующая)
 * - Партии (существующая)
 * - Стойки (новая)
 * - Кластеры (новая)
 * - Учёт брака (новая)
 * - Аналитика (существующая)
 * - Архив (существующая)
 * - Настройки (существующая)
 * 
 * Заменить: src/pages/Beryll/BeryllPage.tsx
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  Server, Package, Boxes, AlertTriangle, BarChart3, 
  Archive, Settings, HardDrive, RefreshCw, Wifi
} from "lucide-react";

// Существующие вкладки
import ServersTab from "./tabs/ServersTab";
import BatchesTab from "./tabs/BatchesTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import ArchiveTab from "./tabs/ArchiveTab";
import SettingsTab from "./tabs/SettingsTab";

// Новые вкладки
import RacksTab from "./tabs/RacksTab";
import ClustersTab from "./tabs/ClustersTab";
import DefectRecordsTab from "./tabs/DefectRecordsTab";

// API
import { syncWithDhcp } from "src/api/beryllApi";

// Определение вкладок
const TABS = [
  { id: "servers", label: "Серверы", icon: Server },
  { id: "batches", label: "Партии", icon: Package },
  { id: "racks", label: "Стойки", icon: HardDrive },
  { id: "clusters", label: "Кластеры", icon: Boxes },
  { id: "defects", label: "Учёт брака", icon: AlertTriangle },
  { id: "analytics", label: "Аналитика", icon: BarChart3 },
  { id: "archive", label: "Архив", icon: Archive },
  { id: "settings", label: "Настройки", icon: Settings },
] as const;

type TabId = typeof TABS[number]["id"];

// Ключ для localStorage
const LAST_SYNC_KEY = "beryll_last_dhcp_sync";

const BeryllPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tabFromUrl = searchParams.get("tab") as TabId;
    return TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : "servers";
  });

  // Состояние для синхронизации DHCP
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem(LAST_SYNC_KEY);
  });

  // Синхронизация с URL
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabId;
    if (tabFromUrl && TABS.some(t => t.id === tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Форматирование времени
  const formatSyncTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("ru-RU", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  // Обработчик синхронизации с DHCP
  const handleSyncDhcp = async () => {
    setSyncing(true);
    try {
      const result = await syncWithDhcp();
      
      // Сохраняем время синхронизации
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);
      setLastSyncTime(now);
      
      if (result.success) {
        toast.success(
          `Синхронизация завершена! Создано: ${result.results.created}, обновлено: ${result.results.updated}`,
          { duration: 4000 }
        );
      } else {
        toast.error(result.message || "Ошибка синхронизации");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка синхронизации с DHCP");
      console.error("DHCP Sync Error:", e);
    } finally {
      setSyncing(false);
    }
  };

  // Рендер содержимого вкладки
  const renderTabContent = () => {
    switch (activeTab) {
      case "servers":
        return <ServersTab />;
      case "batches":
        return <BatchesTab />;
      case "racks":
        return <RacksTab />;
      case "clusters":
        return <ClustersTab />;
      case "defects":
        return <DefectRecordsTab />;
      case "analytics":
        return <AnalyticsTab />;
      case "archive":
        return <ArchiveTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <ServersTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Заголовок */}
      <div className="bg-white shadow">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">АПК Берилл</h1>
                <p className="text-sm text-gray-500">Настройка и мониторинг серверов</p>
              </div>
            </div>

            {/* Блок синхронизации с DHCP */}
            <div className="flex items-center gap-3">
              {/* Время последней синхронизации */}
              {lastSyncTime && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="hidden sm:inline">Синхр:</span>
                  <span>{formatSyncTime(lastSyncTime)}</span>
                </div>
              )}

              {/* Кнопка синхронизации */}
              <button
                onClick={handleSyncDhcp}
                disabled={syncing}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                  transition-all duration-200 shadow-sm
                  ${syncing 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-md"
                  }
                `}
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Синхронизация..." : "Синхронизация с DHCP"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Навигация по вкладкам */}
      <div className="bg-white border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap
                    transition-colors duration-150
                    ${isActive
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                  {/* Бейдж для вкладки "Учёт брака" */}
                  {tab.id === "defects" && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                      !
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Содержимое вкладки */}
      <div className="max-w-full mx-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default BeryllPage;