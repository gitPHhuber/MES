import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  Server,
  ArrowLeft,
  RefreshCw,
  Copy,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Square,
  Package,
  History,
  FileText,
  MessageSquare,
  Edit,
  Save,
  Network,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Archive,
  FileSpreadsheet,
  Upload,
  Download,
  Tag
} from "lucide-react";
import toast from "react-hot-toast";
import { Context } from "src/main";
import {
  getServerById,
  takeServer,
  releaseServer,
  updateServerStatus,
  updateServerNotes,
  toggleChecklistItem,
  updateApkSerialNumber,
  archiveServer,
  generatePassport,
  uploadChecklistFile,
  BeryllServer,
  ServerStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  HISTORY_ACTION_LABELS,
  CHECKLIST_GROUP_LABELS,
  formatDateTime,
  formatDuration
} from "src/api/beryllApi";

import { DefectComments } from '../../../components/beryll/DefectComments';
import { ServerComponents } from '../../../components/beryll/ServerComponents';


export const ServerDetailPage: React.FC = observer(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const context = useContext(Context);
  const currentUser = context?.user?.user;

  const [server, setServer] = useState<BeryllServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Редактирование примечаний
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  
  // Редактирование серийного номера АПК
  const [editingApkSerial, setEditingApkSerial] = useState(false);
  const [apkSerial, setApkSerial] = useState("");
  
  // Секции
  const [showChecklist, setShowChecklist] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  const loadServer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getServerById(parseInt(id));
      setServer(data);
      setNotes(data.notes || "");
      setApkSerial(data.apkSerialNumber || "");
    } catch (e) {
      console.error("Ошибка загрузки:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServer();
  }, [id]);

  const handleTake = async () => {
    if (!server) return;
    setActionLoading(true);
    try {
      await takeServer(server.id);
      await loadServer();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!server) return;
    setActionLoading(true);
    try {
      await releaseServer(server.id);
      await loadServer();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (status: ServerStatus) => {
    if (!server) return;
    setActionLoading(true);
    try {
      await updateServerStatus(server.id, status);
      await loadServer();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!server) return;
    try {
      await updateServerNotes(server.id, notes);
      setEditingNotes(false);
      await loadServer();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    }
  };

  const handleToggleChecklist = async (checklistId: number, completed: boolean) => {
    if (!server) return;
    try {
      await toggleChecklistItem(server.id, checklistId, completed);
      await loadServer();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    }
  };

  // Сохранение серийного номера АПК
  const handleSaveApkSerial = async () => {
    if (!server) return;
    if (!apkSerial.trim()) {
      alert("Введите серийный номер АПК");
      return;
    }
    try {
      await updateApkSerialNumber(server.id, apkSerial.trim());
      setEditingApkSerial(false);
      await loadServer();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка сохранения серийного номера");
    }
  };

  // Архивация сервера
  const handleArchive = async () => {
    if (!server) return;
    if (!server.apkSerialNumber) {
      alert("Перед архивацией необходимо присвоить серийный номер АПК");
      return;
    }
    if (!confirm(`Перенести сервер ${server.apkSerialNumber} в архив?`)) return;
    
    setActionLoading(true);
    try {
      await archiveServer(server.id);
      await loadServer();
      alert("Сервер перенесён в архив");
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка архивации");
    } finally {
      setActionLoading(false);
    }
  };

  // Скачивание паспорта
  const handleDownloadPassport = async () => {
    if (!server) return;
    try {
      const blob = await generatePassport(server.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Паспорт_${server.apkSerialNumber || server.id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка генерации паспорта");
    }
  };

  // Загрузка файла к пункту чек-листа
  const handleUploadFile = async (checklistId: number, file: File) => {
    if (!server) return;
    try {
      await uploadChecklistFile(server.id, checklistId, file);
      await loadServer();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка загрузки файла");
    }
  };

  // ИСПРАВЛЕНО: Функция копирования с toast уведомлением
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано");
  };

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case "NEW": return <Clock className="w-4 h-4" />;
      case "IN_WORK": return <RefreshCw className="w-4 h-4" />;
      case "CLARIFYING": return <HelpCircle className="w-4 h-4" />;
      case "DEFECT": return <XCircle className="w-4 h-4" />;
      case "DONE": return <CheckCircle2 className="w-4 h-4" />;
      case "ARCHIVED": return <Archive className="w-4 h-4" />;
    }
  };

  const calculateWorkTime = () => {
    if (!server?.assignedAt) return null;
    const start = new Date(server.assignedAt);
    const end = server.completedAt ? new Date(server.completedAt) : new Date();
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Server className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">Сервер не найден</p>
        <button
          onClick={() => navigate("/beryll")}
          className="mt-4 text-indigo-600 hover:underline"
        >
          Вернуться к списку
        </button>
      </div>
    );
  }

  const workTime = calculateWorkTime();
  const isAssignedToMe = server.assignedToId === currentUser?.id;
  const canWork = server.status === "IN_WORK" && isAssignedToMe;

  // Подсчёт чек-листа
  const checklistTotal = server.checklists?.length || 0;
  const checklistCompleted = server.checklists?.filter(c => c.completed).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Шапка */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/beryll")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к списку
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Server className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-800">
                  {server.ipAddress}
                </h1>
                <button
                  onClick={() => copyToClipboard(server.ipAddress)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Копировать IP"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${STATUS_COLORS[server.status]}`}>
                  {getStatusIcon(server.status)}
                  {STATUS_LABELS[server.status]}
                </span>
              </div>
              {server.hostname && (
                <p className="text-gray-500 mt-1 font-mono text-sm">
                  {server.hostname}
                </p>
              )}
            </div>
          </div>

          {/* Действия */}
          <div className="flex items-center gap-2">
            {server.status === "NEW" && (
              <button
                onClick={handleTake}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Взять в работу
              </button>
            )}

            {canWork && (
              <>
                <button
                  onClick={handleRelease}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Square className="w-4 h-4" />
                  Отпустить
                </button>
                <button
                  onClick={() => handleStatusChange("DONE")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Завершить
                </button>
              </>
            )}

            {/* Кнопка скачивания паспорта */}
            <button
              onClick={handleDownloadPassport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              title="Скачать паспорт"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Паспорт
            </button>

            {/* Кнопка архивации (для статуса DONE) */}
            {server.status === "DONE" && (
              <button
                onClick={handleArchive}
                disabled={actionLoading || !server.apkSerialNumber}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                title={!server.apkSerialNumber ? "Сначала укажите серийный номер АПК" : "Перенести в архив"}
              >
                <Archive className="w-4 h-4" />
                В архив
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Левая колонка - основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Информация о сервере */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Информация о сервере
            </h2>

            {/* Серийный номер АПК - главный идентификатор */}
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Серийный номер АПК</span>
                </div>
                {!editingApkSerial ? (
                  <button
                    onClick={() => setEditingApkSerial(true)}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    {server.apkSerialNumber ? "Изменить" : "Присвоить"}
                  </button>
                ) : null}
              </div>
              
              {editingApkSerial ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={apkSerial}
                    onChange={(e) => setApkSerial(e.target.value)}
                    placeholder="BL020XX-2500XX"
                    className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleSaveApkSerial}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingApkSerial(false);
                      setApkSerial(server.apkSerialNumber || "");
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  {server.apkSerialNumber ? (
                    <>
                      <span className="text-xl font-bold font-mono text-purple-700">
                        {server.apkSerialNumber}
                      </span>
                      <button
                        onClick={() => copyToClipboard(server.apkSerialNumber!)}
                        className="p-1 text-purple-400 hover:text-purple-600"
                        title="Копировать"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Не присвоен</span>
                  )}
                </div>
              )}
              
              {server.archivedAt && (
                <div className="mt-2 flex items-center gap-2 text-sm text-purple-600">
                  <Archive className="w-4 h-4" />
                  <span>В архиве с {formatDateTime(server.archivedAt)}</span>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <InfoRow
                icon={<Network className="w-4 h-4" />}
                label="MAC адрес"
                value={server.macAddress || "-"}
                copyable
                onCopy={copyToClipboard}
              />
              <InfoRow
                icon={<FileText className="w-4 h-4" />}
                label="Серийный номер"
                value={server.serialNumber || "-"}
                copyable
                onCopy={copyToClipboard}
              />
              <InfoRow
                icon={<Package className="w-4 h-4" />}
                label="Партия"
                value={server.batch?.title || "Не привязан"}
                link={server.batch ? `/beryll/batch/${server.batch.id}` : undefined}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Последняя синхр."
                value={formatDateTime(server.lastSyncAt)}
              />
              <InfoRow
                icon={<User className="w-4 h-4" />}
                label="Исполнитель"
                value={server.assignedTo
                  ? `${server.assignedTo.surname} ${server.assignedTo.name}`
                  : "-"
                }
              />
              <InfoRow
                icon={<Clock className="w-4 h-4" />}
                label="Время в работе"
                value={workTime ? formatDuration(workTime) : "-"}
              />
            </div>
          </div>

          {/* Чек-лист */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-800">
                  Чек-лист операций
                </span>
                <span className="text-sm text-gray-500">
                  ({checklistCompleted}/{checklistTotal})
                </span>
              </div>
              {showChecklist ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showChecklist && (
              <div className="px-6 pb-4 border-t border-gray-100">
                {!server.checklists || server.checklists.length === 0 ? (
                  <p className="py-4 text-gray-400 text-center">
                    Чек-лист не настроен
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {server.checklists
                      .sort((a, b) => (a.template?.sortOrder || 0) - (b.template?.sortOrder || 0))
                      .map((item) => (
                        <div
                          key={item.id}
                          className="py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleChecklist(
                                item.checklistTemplateId,
                                !item.completed
                              )}
                              disabled={!canWork}
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                                item.completed
                                  ? "bg-green-500 border-green-500 text-white"
                                  : canWork
                                    ? "border-gray-300 hover:border-indigo-500"
                                    : "border-gray-200 bg-gray-50"
                              }`}
                            >
                              {item.completed && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                            <div>
                              <div className={`font-medium ${
                                item.completed ? "text-gray-400 line-through" : "text-gray-800"
                              }`}>
                                {item.template?.title}
                              </div>
                              {item.template?.description && (
                                <div className="text-xs text-gray-500">
                                  {item.template.description}
                                </div>
                              )}
                            </div>
                          </div>

                          {item.completed && item.completedBy && (
                            <div className="text-xs text-gray-400 text-right">
                              <div>
                                {item.completedBy.surname} {item.completedBy.name?.charAt(0)}.
                              </div>
                              <div>{formatDateTime(item.completedAt)}</div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Комплектующие */}
          <div className="lg:col-span-2">
            <ServerComponents serverId={server.id} serverIp={server.ipAddress} />
          </div>

          {/* Дефекты */}
          <div className="lg:col-span-2">
            <DefectComments serverId={server.id} />  
          </div>

          {/* История */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-gray-400" />
                <span className="font-semibold text-gray-800">
                  История операций
                </span>
                <span className="text-sm text-gray-500">
                  ({server.history?.length || 0})
                </span>
              </div>
              {showHistory ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showHistory && (
              <div className="px-6 pb-4 border-t border-gray-100">
                {!server.history || server.history.length === 0 ? (
                  <p className="py-4 text-gray-400 text-center">
                    История пуста
                  </p>
                ) : (
                  <div className="relative">
                    {/* Линия таймлайна */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

                    <div className="space-y-4 pt-4">
                      {server.history.map((item) => (
                        <div key={item.id} className="relative pl-8">
                          {/* Точка */}
                          <div className="absolute left-0 w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                          </div>

                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-gray-800">
                                {HISTORY_ACTION_LABELS[item.action]}
                              </div>
                              {item.action === "STATUS_CHANGED" && (
                                <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                                  <span>{STATUS_LABELS[item.fromStatus as ServerStatus] || item.fromStatus}</span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span>{STATUS_LABELS[item.toStatus as ServerStatus] || item.toStatus}</span>
                                </div>
                              )}
                              {item.comment && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {item.comment}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-xs text-gray-400">
                              <div>{formatDateTime(item.createdAt)}</div>
                              {item.user && (
                                <div>{item.user.surname} {item.user.name?.charAt(0)}.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Правая колонка - примечания и статус */}
        <div className="space-y-6">
          {/* Быстрая смена статуса */}
          {canWork && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Изменить статус</h3>
              <div className="grid grid-cols-2 gap-2">
                {(["CLARIFYING", "DEFECT"] as ServerStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={actionLoading}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${STATUS_COLORS[status]} hover:opacity-80 transition-opacity`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Примечания */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                Примечания
              </h3>
              {!editingNotes && canWork && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>

            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="Добавьте примечание..."
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setNotes(server.notes || "");
                      setEditingNotes(false);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Save className="w-3 h-3" />
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${server.notes ? "text-gray-600" : "text-gray-400 italic"}`}>
                {server.notes || "Примечания отсутствуют"}
              </p>
            )}
          </div>

          {/* Информация о lease */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">DHCP Lease</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Статус</span>
                <span className={server.leaseActive ? "text-green-600" : "text-red-600"}>
                  {server.leaseActive ? "Активен" : "Неактивен"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Начало</span>
                <span className="text-gray-800">{formatDateTime(server.leaseStart)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Окончание</span>
                <span className="text-gray-800">{formatDateTime(server.leaseEnd)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ИСПРАВЛЕНО: Компонент строки информации с поддержкой toast уведомлений
interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
  link?: string;
  onCopy?: (text: string) => void;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, copyable, link, onCopy }) => {
  const navigate = useNavigate();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    if (onCopy) {
      onCopy(value);
    } else {
      toast.success("Скопировано");
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        {link ? (
          <button
            onClick={() => navigate(link)}
            className="font-medium text-indigo-600 hover:underline truncate block"
          >
            {value}
          </button>
        ) : (
          <div className="font-medium text-gray-800 truncate">{value}</div>
        )}
      </div>
      {copyable && value !== "-" && (
        <button
          onClick={handleCopy}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Копировать"
        >
          <Copy className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ServerDetailPage;