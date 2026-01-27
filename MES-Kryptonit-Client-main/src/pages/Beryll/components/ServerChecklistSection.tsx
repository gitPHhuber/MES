/**
 * ServerChecklistSection.tsx - Секция чек-листа в паспорте сервера
 * 
 * Функциональность:
 * - Отображение этапов с группировкой
 * - Индикатор "требуется скриншот"
 * - Загрузка файлов-доказательств
 * - Валидация перед отметкой выполнения
 * 
 * Путь: src/pages/Beryll/components/ServerChecklistSection.tsx
 */

import { useState, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  Camera,
  Upload,
  Trash2,
  Download,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Eye
} from "lucide-react";
import {
  BeryllServerChecklist,
  BeryllChecklistFile,
  ChecklistGroup,
  CHECKLIST_GROUP_LABELS,
  toggleChecklistItem,
  uploadChecklistFile,
  deleteChecklistFile,
  downloadFile
} from "src/api/beryllApi";

interface ServerChecklistSectionProps {
  serverId: number;
  checklists: BeryllServerChecklist[];
  onUpdate: () => void;
  readOnly?: boolean;
}

export const ServerChecklistSection: React.FC<ServerChecklistSectionProps> = ({
  serverId,
  checklists,
  onUpdate,
  readOnly = false
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<ChecklistGroup>>(
    new Set(["VISUAL", "TESTING", "QC_PRIMARY", "BURN_IN", "QC_FINAL"])
  );
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<BeryllChecklistFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null);

  // Группировка по groupCode
  const groupedChecklists = checklists.reduce((acc, item) => {
    const group = item.template?.groupCode || "TESTING";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<ChecklistGroup, BeryllServerChecklist[]>);

  const groupOrder: ChecklistGroup[] = ["VISUAL", "TESTING", "QC_PRIMARY", "BURN_IN", "QC_FINAL"];

  const toggleGroup = (group: ChecklistGroup) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  // Обработчик переключения статуса
  const handleToggle = async (checklistId: number, currentCompleted: boolean, requiresFile: boolean, hasFiles: boolean) => {
    if (readOnly) return;

    // Валидация: если требуется файл и пытаемся отметить выполненным
    if (!currentCompleted && requiresFile && !hasFiles) {
      alert("Для выполнения этого этапа необходимо сначала загрузить скриншот/доказательство");
      return;
    }

    setTogglingId(checklistId);
    try {
      await toggleChecklistItem(serverId, checklistId, !currentCompleted);
      onUpdate();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    } finally {
      setTogglingId(null);
    }
  };

  // Открытие диалога выбора файла
  const handleUploadClick = (checklistId: number) => {
    setActiveUploadId(checklistId);
    fileInputRef.current?.click();
  };

  // Загрузка файла
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadId) return;

    // Проверка типа файла
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Разрешены только изображения (JPG, PNG, GIF, WEBP) и PDF");
      return;
    }

    // Проверка размера (5 МБ)
    if (file.size > 5 * 1024 * 1024) {
      alert("Максимальный размер файла: 5 МБ");
      return;
    }

    setUploadingId(activeUploadId);
    try {
      await uploadChecklistFile(serverId, activeUploadId, file);
      onUpdate();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка загрузки файла");
    } finally {
      setUploadingId(null);
      setActiveUploadId(null);
      // Сброс input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Удаление файла
  const handleDeleteFile = async (fileId: number, checklistCompleted: boolean) => {
    if (readOnly) return;
    
    const message = checklistCompleted 
      ? "Удаление последнего файла снимет отметку выполнения. Продолжить?"
      : "Удалить этот файл?";
      
    if (!confirm(message)) return;

    try {
      await deleteChecklistFile(fileId);
      onUpdate();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка удаления файла");
    }
  };

  // Скачивание файла
  const handleDownloadFile = (fileId: number, originalName: string) => {
    const url = downloadFile(fileId);
    const a = document.createElement("a");
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Подсчёт статистики
  const totalCount = checklists.length;
  const completedCount = checklists.filter(c => c.completed).length;
  const requiredCount = checklists.filter(c => c.template?.isRequired).length;
  const requiredCompletedCount = checklists.filter(c => c.template?.isRequired && c.completed).length;

  // Проверка типа файла для отображения превью
  const isImageFile = (file: BeryllChecklistFile) => {
    return file.mimetype?.startsWith("image/") || 
           ["jpg", "jpeg", "png", "gif", "webp"].some(ext => 
             file.originalName?.toLowerCase().endsWith(`.${ext}`)
           );
  };

  return (
    <div className="space-y-4">
      {/* Скрытый input для файлов */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Заголовок и статистика */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Чек-лист работ</h3>
          <p className="text-sm text-gray-500">
            Выполнено: {completedCount} из {totalCount}
            {requiredCount > 0 && (
              <span className="ml-2 text-amber-600">
                (обязательных: {requiredCompletedCount}/{requiredCount})
              </span>
            )}
          </p>
        </div>

        {/* Прогресс-бар */}
        <div className="flex items-center gap-3">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Группы чек-листа */}
      <div className="space-y-3">
        {groupOrder.map(groupCode => {
          const groupItems = groupedChecklists[groupCode];
          if (!groupItems || groupItems.length === 0) return null;

          const isExpanded = expandedGroups.has(groupCode);
          const groupCompleted = groupItems.filter(i => i.completed).length;
          const groupTotal = groupItems.length;

          return (
            <div 
              key={groupCode} 
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Заголовок группы */}
              <button
                onClick={() => toggleGroup(groupCode)}
                className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">
                    {CHECKLIST_GROUP_LABELS[groupCode]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    groupCompleted === groupTotal 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    {groupCompleted}/{groupTotal}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Элементы группы */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {groupItems.map((item) => {
                    const template = item.template;
                    const requiresFile = template?.requiresFile || false;
                    const hasFiles = item.files && item.files.length > 0;
                    const canComplete = !requiresFile || hasFiles;

                    return (
                      <div key={item.id} className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Чекбокс */}
                          <button
                            onClick={() => handleToggle(item.checklistTemplateId, item.completed, requiresFile, !!hasFiles)}
                            disabled={readOnly || togglingId === item.checklistTemplateId}
                            className={`mt-0.5 shrink-0 ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                          >
                            {togglingId === item.checklistTemplateId ? (
                              <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                            ) : item.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className={`w-5 h-5 ${
                                !canComplete ? "text-amber-400" : "text-gray-300"
                              }`} />
                            )}
                          </button>

                          {/* Информация */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium ${
                                item.completed ? "text-gray-500 line-through" : "text-gray-800"
                              }`}>
                                {template?.title}
                              </span>
                              
                              {template?.isRequired && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-medium">
                                  ОБЯЗ.
                                </span>
                              )}
                              
                              {requiresFile && (
                                <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium flex items-center gap-1 ${
                                  hasFiles 
                                    ? "bg-green-100 text-green-700" 
                                    : "bg-amber-100 text-amber-700"
                                }`}>
                                  <Camera className="w-3 h-3" />
                                  {hasFiles ? "СКРИН ✓" : "НУЖЕН СКРИН"}
                                </span>
                              )}
                            </div>

                            {template?.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {template.description}
                              </p>
                            )}

                            {/* Информация о выполнении */}
                            {item.completed && item.completedBy && (
                              <p className="text-xs text-gray-400 mt-1">
                                Выполнил: {item.completedBy.name || item.completedBy.login}
                                {item.completedAt && (
                                  <> в {new Date(item.completedAt).toLocaleString("ru-RU")}</>
                                )}
                              </p>
                            )}

                            {/* Файлы */}
                            {hasFiles && (
                              <div className="mt-3 space-y-2">
                                {item.files!.map((file) => (
                                  <div 
                                    key={file.id} 
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                  >
                                    {/* Иконка типа */}
                                    {isImageFile(file) ? (
                                      <ImageIcon className="w-4 h-4 text-indigo-500" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-red-500" />
                                    )}

                                    {/* Имя файла */}
                                    <span className="flex-1 text-sm text-gray-600 truncate">
                                      {file.originalName}
                                    </span>

                                    {/* Размер */}
                                    <span className="text-xs text-gray-400">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </span>

                                    {/* Действия */}
                                    {isImageFile(file) && (
                                      <button
                                        onClick={() => setPreviewFile(file)}
                                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                        title="Просмотр"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    )}
                                    
                                    <button
                                      onClick={() => handleDownloadFile(file.id, file.originalName)}
                                      className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                      title="Скачать"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>

                                    {!readOnly && (
                                      <button
                                        onClick={() => handleDeleteFile(file.id, item.completed)}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        title="Удалить"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Предупреждение о необходимости скрина */}
                            {requiresFile && !hasFiles && !item.completed && (
                              <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                Загрузите скриншот для выполнения этого этапа
                              </div>
                            )}
                          </div>

                          {/* Кнопка загрузки */}
                          {!readOnly && (
                            <button
                              onClick={() => handleUploadClick(item.checklistTemplateId)}
                              disabled={uploadingId === item.checklistTemplateId}
                              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                                requiresFile && !hasFiles
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {uploadingId === item.checklistTemplateId ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              Файл
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Модальное окно просмотра изображения */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <span className="font-medium text-gray-800">{previewFile.originalName}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(previewFile.id, previewFile.originalName)}
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-100">
              <img 
                src={downloadFile(previewFile.id)} 
                alt={previewFile.originalName}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerChecklistSection;