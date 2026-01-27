import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Play, Wifi, WifiOff, Gauge, Timer, CloudOff, Server
} from 'lucide-react';
import clsx from 'clsx';

import {
  getMonitoringStats, getCachedStatus, pingServer, pingAllServers
} from '../../api/beryll/defectsAndMonitoringAPI';

import type {
  MonitoringStats, ServerPingResult
} from '../../types/beryll/defectsAndMonitoring';

interface Props {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const MonitoringDashboard: React.FC<Props> = ({
  autoRefresh = true,
  refreshInterval = 60
}) => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [servers, setServers] = useState<ServerPingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'online' | 'offline'>('all');
  const [countdown, setCountdown] = useState(refreshInterval);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsData, statusData] = await Promise.all([
        getMonitoringStats(),
        forceRefresh ? pingAllServers({ forceRefresh: true }) : getCachedStatus()
      ]);
      
      setStats(statsData);
      setServers(statusData.servers || []);
      setCountdown(refreshInterval);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [refreshInterval]);

  useEffect(() => {
    loadData();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(() => loadData(), refreshInterval * 1000);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : refreshInterval));
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [loadData, autoRefresh, refreshInterval]);

  const handlePingAll = async () => {
    try {
      setPinging(true);
      setError(null);
      await pingAllServers({ forceRefresh: true });
      await loadData();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Ошибка пинга');
    } finally {
      setPinging(false);
    }
  };

  const handlePingServer = async (serverId: number) => {
    try {
      const result = await pingServer(serverId);
      setServers(prev => prev.map(s => s.serverId === serverId ? result : s));
    } catch (e: any) {
      setError('Ошибка пинга сервера');
    }
  };

  const onlineServers = servers.filter(s => s.online);
  const offlineServers = servers.filter(s => !s.online);
  const filteredServers = tab === 'all' ? servers : tab === 'online' ? onlineServers : offlineServers;
  const onlinePercent = servers.length > 0 ? Math.round((onlineServers.length / servers.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Мониторинг серверов</h1>
        <div className="flex items-center gap-4">
          {autoRefresh && (
            <span className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Timer size={14} />
              Обновление через {countdown}с
            </span>
          )}
          <button
            onClick={handlePingAll}
            disabled={pinging}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
              pinging ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
          >
            {pinging ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            Пинг всех
          </button>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Всего серверов</p>
          {loading ? <div className="h-9 w-16 bg-slate-200 animate-pulse rounded" /> : <p className="text-3xl font-bold text-slate-800">{stats?.total || servers.length}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-emerald-500 border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wifi size={16} className="text-emerald-500" />
            <p className="text-sm text-slate-500">Онлайн</p>
          </div>
          {loading ? <div className="h-9 w-16 bg-slate-200 animate-pulse rounded" /> : <p className="text-3xl font-bold text-emerald-600">{stats?.online || onlineServers.length}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-red-500 border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <WifiOff size={16} className="text-red-500" />
            <p className="text-sm text-slate-500">Оффлайн</p>
          </div>
          {loading ? <div className="h-9 w-16 bg-slate-200 animate-pulse rounded" /> : <p className="text-3xl font-bold text-red-600">{stats?.offline || offlineServers.length}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Gauge size={16} className="text-slate-400" />
            <p className="text-sm text-slate-500">Средняя задержка</p>
          </div>
          {loading ? <div className="h-9 w-20 bg-slate-200 animate-pulse rounded" /> : <p className="text-3xl font-bold text-slate-800">{stats?.avgLatency ? `${stats.avgLatency} мс` : '—'}</p>}
        </div>
      </div>

      {/* Прогресс */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Серверов онлайн</span>
          <span className="text-sm font-bold text-slate-700">{onlinePercent}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={clsx("h-full rounded-full transition-all duration-500", onlinePercent > 80 ? "bg-emerald-500" : onlinePercent > 50 ? "bg-yellow-500" : "bg-red-500")}
            style={{ width: `${onlinePercent}%` }}
          />
        </div>
      </div>

      {/* Предупреждение */}
      {stats?.staleServers && stats.staleServers > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CloudOff size={18} />
          <span>{stats.staleServers} серверов не проверялись более 5 минут</span>
        </div>
      )}

      {/* Табы и таблица */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {[
            { key: 'all', label: `Все (${servers.length})` },
            { key: 'online', label: `Онлайн (${onlineServers.length})` },
            { key: 'offline', label: `Оффлайн (${offlineServers.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={clsx(
                "px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                tab === t.key ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">IP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Hostname</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Серийный</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Задержка</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Проверка</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">⚡</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-5 bg-slate-200 animate-pulse rounded w-20" /></td>)}</tr>
                ))
              ) : filteredServers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400"><Server size={40} className="mx-auto mb-2 opacity-30" />Нет серверов</td></tr>
              ) : (
                filteredServers.map((server) => (
                  <tr key={server.serverId} className={clsx("transition-colors", server.online ? "bg-emerald-50/50 hover:bg-emerald-100/50" : "bg-red-50/50 hover:bg-red-100/50")}>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", server.online ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                        {server.online ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {server.online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><code className="text-sm text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{server.ipAddress || '—'}</code></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{server.hostname || '—'}</td>
                    <td className="px-4 py-3"><code className="text-sm text-slate-600">{server.apkSerialNumber || server.serialNumber || '—'}</code></td>
                    <td className="px-4 py-3">
                      {server.latency !== null ? (
                        <span className={clsx("inline-flex px-2 py-0.5 rounded text-xs font-medium", server.latency < 50 ? "bg-emerald-100 text-emerald-700" : server.latency < 200 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                          {server.latency.toFixed(1)} мс
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{server.checkedAt ? new Date(server.checkedAt).toLocaleTimeString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handlePingServer(server.serverId)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Пинг">
                        <RefreshCw size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {stats?.lastFullScan && <p className="text-xs text-slate-400 text-center">Последнее сканирование: {new Date(stats.lastFullScan).toLocaleString()}</p>}
    </div>
  );
};

export default MonitoringDashboard;
