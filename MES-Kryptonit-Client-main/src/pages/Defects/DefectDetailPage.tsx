import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Wrench, 
  CheckCircle2, 
  XCircle,
  Clock,
  User,
  Plus,
  Trash2,
  PackageCheck,
  RotateCcw
} from "lucide-react";
import {
  fetchDefectById,
  markDefectRepaired,
  markDefectScrapped,
  verifyDefectRepair,
  updateDefectStatus
} from "src/api/defectApi";
import {
  BoardDefect,
  RepairAction,
  BOARD_TYPE_LABELS,
  DEFECT_STATUS_LABELS,
  DEFECT_STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  ACTION_TYPE_LABELS,
  ACTION_TYPE_ICONS,
  ACTION_RESULT_LABELS,
  ACTION_RESULT_COLORS
} from "src/types/DefectTypes";
import { AddRepairActionModal } from "./components/AddRepairActionModal";

export const DefectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [defect, setDefect] = useState<BoardDefect | null>(null);
  const [boardInfo, setBoardInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Модалки
  const [showAddAction, setShowAddAction] = useState(false);
  const [showRepairedModal, setShowRepairedModal] = useState(false);
  const [showScrapModal, setShowScrapModal] = useState(false);
  
  // Для модалок
  const [repairNote, setRepairNote] = useState("");
  const [repairTime, setRepairTime] = useState("");
  const [scrapReason, setScrapReason] = useState("");

  const loadDefect = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await fetchDefectById(Number(id));
      setDefect(response.defect);
      setBoardInfo(response.boardInfo);
    } catch (e) {
      console.error("Ошибка загрузки:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDefect();
  }, [loadDefect]);

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Действия
  const handleMarkRepaired = async () => {
    if (!defect) return;
    setActionLoading(true);
    try {
      await markDefectRepaired(defect.id, {
        repairNote: repairNote || undefined,
        timeSpentMinutes: repairTime ? Number(repairTime) : undefined
      });
      setShowRepairedModal(false);
      setRepairNote("");
      setRepairTime("");
      loadDefect();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkScrapped = async () => {
    if (!defect) return;
    setActionLoading(true);
    try {
      await markDefectScrapped(defect.id, {
        reason: scrapReason || undefined
      });
      setShowScrapModal(false);
      setScrapReason("");
      loadDefect();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!defect) return;
    if (!confirm("Подтвердить, что ремонт выполнен качественно?")) return;
    
    setActionLoading(true);
    try {
      await verifyDefectRepair(defect.id);
      loadDefect();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTakeToWork = async () => {
    if (!defect) return;
    setActionLoading(true);
    try {
      await updateDefectStatus(defect.id, "IN_REPAIR");
      loadDefect();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!defect) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">Дефект не найден</p>
          <button
            onClick={() => navigate("/defects")}
            className="mt-4 text-orange-500 hover:text-orange-600"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  const isActive = ["OPEN", "IN_REPAIR", "REPAIRED"].includes(defect.status);
  const canRepair = ["OPEN", "IN_REPAIR"].includes(defect.status);
  const canVerify = defect.status === "REPAIRED";
  const canScrap = ["OPEN", "IN_REPAIR"].includes(defect.status);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 pb-20">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/defects")}
            className="p-2 hover:bg-white rounded-lg transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">Дефект #{defect.id}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${DEFECT_STATUS_COLORS[defect.status]}`}>
                {DEFECT_STATUS_LABELS[defect.status]}
              </span>
            </div>
            <p className="text-gray-500">
              {BOARD_TYPE_LABELS[defect.boardType]}
              {defect.serialNumber && <span className="ml-2 font-mono">• {defect.serialNumber}</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Левая колонка — информация */}
          <div className="col-span-2 space-y-6">
            
            {/* Информация о дефекте */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" size={20} />
                Информация о дефекте
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Категория</span>
                  <div className="flex items-center gap-2 mt-1">
                    {defect.category && (
                      <>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[defect.category.severity]}`}>
                          {SEVERITY_LABELS[defect.category.severity]}
                        </span>
                        <span className="font-medium">{defect.category.title}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Обнаружил</span>
                  <div className="flex items-center gap-2 mt-1">
                    <User size={16} className="text-gray-400" />
                    <span>
                      {defect.detectedBy 
                        ? `${defect.detectedBy.surname} ${defect.detectedBy.name}`
                        : "—"
                      }
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Дата обнаружения</span>
                  <div className="mt-1 font-medium">{formatDate(defect.detectedAt)}</div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Время ремонта</span>
                  <div className="mt-1 font-medium">
                    {defect.totalRepairMinutes > 0 
                      ? `${defect.totalRepairMinutes} минут`
                      : "—"
                    }
                  </div>
                </div>
              </div>
              
              {defect.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Описание</span>
                  <p className="mt-1 text-gray-700">{defect.description}</p>
                </div>
              )}
              
              {defect.closedAt && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Закрыт</span>
                  <div className="mt-1">
                    {defect.closedBy && (
                      <span>{defect.closedBy.surname} {defect.closedBy.name} • </span>
                    )}
                    <span className="text-gray-500">{formatDate(defect.closedAt)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* История ремонта */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Wrench className="text-blue-500" size={20} />
                  История ремонта
                </h2>
                {canRepair && (
                  <button
                    onClick={() => setShowAddAction(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    <Plus size={16} />
                    Добавить
                  </button>
                )}
              </div>
              
              {defect.repairs && defect.repairs.length > 0 ? (
                <div className="space-y-3">
                  {defect.repairs.map((action: RepairAction) => (
                    <div 
                      key={action.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{ACTION_TYPE_ICONS[action.actionType]}</span>
                          <div>
                            <span className="font-medium">{ACTION_TYPE_LABELS[action.actionType]}</span>
                            {action.timeSpentMinutes && (
                              <span className="text-sm text-gray-500 ml-2">
                                • {action.timeSpentMinutes} мин
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {formatShortDate(action.performedAt)}
                          </div>
                          <div className="text-sm">
                            {action.performedBy && (
                              <span>{action.performedBy.surname} {action.performedBy.name?.charAt(0)}.</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700">{action.description}</p>
                      <div className="mt-2">
                        <span className={`text-sm font-medium ${ACTION_RESULT_COLORS[action.result]}`}>
                          {action.result === "SUCCESS" && "✓ "}
                          {action.result === "FAILED" && "✗ "}
                          {ACTION_RESULT_LABELS[action.result]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="mx-auto mb-2" size={32} />
                  <p>Пока нет записей</p>
                </div>
              )}
            </div>
          </div>

          {/* Правая колонка — действия */}
          <div className="space-y-6">
            {/* Действия */}
            {isActive && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Действия</h2>
                
                <div className="space-y-3">
                  {defect.status === "OPEN" && (
                    <button
                      onClick={handleTakeToWork}
                      disabled={actionLoading}
                      className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Wrench size={18} />
                      Взять в работу
                    </button>
                  )}
                  
                  {canRepair && (
                    <>
                      <button
                        onClick={() => setShowAddAction(true)}
                        className="w-full py-3 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <Plus size={18} />
                        Добавить действие
                      </button>
                      
                      <button
                        onClick={() => setShowRepairedModal(true)}
                        disabled={actionLoading}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <CheckCircle2 size={18} />
                        Отремонтировано
                      </button>
                    </>
                  )}
                  
                  {canVerify && (
                    <button
                      onClick={handleVerify}
                      disabled={actionLoading}
                      className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <PackageCheck size={18} />
                      Подтвердить (ОТК)
                    </button>
                  )}
                  
                  {canScrap && (
                    <button
                      onClick={() => setShowScrapModal(true)}
                      disabled={actionLoading}
                      className="w-full py-3 border-2 border-red-500 text-red-600 hover:bg-red-50 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Trash2 size={18} />
                      Списать
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Инфо о плате (если есть) */}
            {boardInfo && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Информация о плате</h2>
                <pre className="text-xs text-gray-600 overflow-auto">
                  {JSON.stringify(boardInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модалка добавления действия */}
      {showAddAction && (
        <AddRepairActionModal
          defectId={defect.id}
          boardType={defect.boardType}
          onClose={() => setShowAddAction(false)}
          onAdded={() => {
            setShowAddAction(false);
            loadDefect();
          }}
        />
      )}

      {/* Модалка "Отремонтировано" */}
      {showRepairedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-green-500" size={24} />
              Отметить как отремонтированное
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Что сделано (опционально)
              </label>
              <textarea
                value={repairNote}
                onChange={e => setRepairNote(e.target.value)}
                rows={3}
                placeholder="Краткое описание..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Затрачено времени (минут)
              </label>
              <input
                type="number"
                value={repairTime}
                onChange={e => setRepairTime(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRepairedModal(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleMarkRepaired}
                disabled={actionLoading}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl font-semibold"
              >
                {actionLoading ? "..." : "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка "Списать" */}
      {showScrapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <XCircle className="text-red-500" size={24} />
              Списать как брак
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Причина списания
              </label>
              <textarea
                value={scrapReason}
                onChange={e => setScrapReason(e.target.value)}
                rows={3}
                placeholder="Укажите причину..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowScrapModal(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleMarkScrapped}
                disabled={actionLoading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl font-semibold"
              >
                {actionLoading ? "..." : "Списать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
