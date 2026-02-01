import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Eye,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2
} from "lucide-react";
import {
  BeryllServerChecklist,
  BeryllChecklistFile,
  ChecklistGroup,
  CHECKLIST_GROUP_LABELS,
  toggleChecklistItem,
  uploadChecklistFile,
  deleteChecklistFile
} from "src/api/beryllApi";
import { $authHost } from "src/api/index";

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
  const DEV = import.meta.env.DEV;
  const dlog = (...args: any[]) => {
    if (DEV) console.log(...args);
  };
  const derr = (...args: any[]) => {
    if (DEV) console.error(...args);
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<ChecklistGroup>>(
    new Set(["VISUAL", "TESTING", "QC_PRIMARY", "BURN_IN", "QC_FINAL"])
  );
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null);

  const [previewFile, setPreviewFile] = useState<BeryllChecklistFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleClosePreview = useCallback(() => {
    dlog("=== handleClosePreview called ===");

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewError(null);
    setZoom(1);
    setRotation(0);
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Freeze page scroll while modal is open (no jump, restores position)
  useEffect(() => {
    if (!previewFile) return;

    const scrollY = window.scrollY;
    const body = document.body;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      const top = body.style.top;

      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";

      const restoreY = top ? -parseInt(top, 10) : scrollY;
      window.scrollTo(0, restoreY);
    };
  }, [previewFile]);

  // Close on ESC
  useEffect(() => {
    if (!previewFile) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClosePreview();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewFile, handleClosePreview]);

  const groupedChecklists = checklists.reduce((acc, item) => {
    const group = item.template?.groupCode || "TESTING";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<ChecklistGroup, BeryllServerChecklist[]>);

  const groupOrder: ChecklistGroup[] = ["VISUAL", "TESTING", "QC_PRIMARY", "BURN_IN", "QC_FINAL"];

  const toggleGroup = (group: ChecklistGroup) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) newExpanded.delete(group);
    else newExpanded.add(group);
    setExpandedGroups(newExpanded);
  };

  const handleToggle = async (
    checklistId: number,
    currentCompleted: boolean,
    requiresFile: boolean,
    hasFiles: boolean
  ) => {
    if (readOnly) return;

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

  const handleUploadClick = (checklistId: number) => {
    setActiveUploadId(checklistId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadId) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Разрешены только изображения (JPG, PNG, GIF, WEBP) и PDF");
      return;
    }

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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  const handleDownloadFile = async (fileId: number, originalName: string) => {
    dlog("=== handleDownloadFile called ===", { fileId, originalName });

    try {
      const response = await $authHost.get(`/api/beryll/files/${fileId}?download=true`, {
        responseType: "blob"
      });

      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      derr("Download error:", e);
      alert("Ошибка скачивания файла");
    }
  };

  const handleOpenPreview = async (file: BeryllChecklistFile) => {
    dlog("=== handleOpenPreview called ===", file);

    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError(null);
    setZoom(1);
    setRotation(0);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      dlog("Fetching file...", `/api/beryll/files/${file.id}`);

      const response = await $authHost.get(`/api/beryll/files/${file.id}`, {
        responseType: "blob"
      });

      dlog("Response received:", response);

      const url = URL.createObjectURL(response.data);
      dlog("Blob URL created:", url);
      setPreviewUrl(url);
    } catch (e: any) {
      derr("Preview error:", e);
      setPreviewError("Не удалось загрузить изображение");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const totalCount = checklists.length;
  const completedCount = checklists.filter((c) => c.completed).length;
  const requiredCount = checklists.filter((c) => c.template?.isRequired).length;
  const requiredCompletedCount = checklists.filter((c) => c.template?.isRequired && c.completed).length;

  const isImageFile = (file: BeryllChecklistFile) => {
    return (
      file.mimetype?.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp"].some((ext) =>
        file.originalName?.toLowerCase().endsWith(`.${ext}`)
      )
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

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

      <div className="space-y-3">
        {groupOrder.map((groupCode) => {
          const groupItems = groupedChecklists[groupCode];
          if (!groupItems || groupItems.length === 0) return null;

          const isExpanded = expandedGroups.has(groupCode);
          const groupCompleted = groupItems.filter((i) => i.completed).length;
          const groupTotal = groupItems.length;

          return (
            <div key={groupCode} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(groupCode)}
                className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">{CHECKLIST_GROUP_LABELS[groupCode]}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      groupCompleted === groupTotal
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {groupCompleted}/{groupTotal}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

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
                          <button
                            type="button"
                            onClick={() =>
                              handleToggle(
                                item.checklistTemplateId,
                                item.completed,
                                requiresFile,
                                !!hasFiles
                              )
                            }
                            disabled={readOnly || togglingId === item.checklistTemplateId}
                            className={`mt-0.5 shrink-0 ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                          >
                            {togglingId === item.checklistTemplateId ? (
                              <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                            ) : item.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle
                                className={`w-5 h-5 ${
                                  !canComplete ? "text-amber-400" : "text-gray-300"
                                }`}
                              />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-medium ${
                                  item.completed ? "text-gray-500 line-through" : "text-gray-800"
                                }`}
                              >
                                {template?.title}
                              </span>

                              {template?.isRequired && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-medium">
                                  ОБЯЗ.
                                </span>
                              )}

                              {requiresFile && (
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] rounded font-medium flex items-center gap-1 ${
                                    hasFiles
                                      ? "bg-green-100 text-green-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  <Camera className="w-3 h-3" />
                                  {hasFiles ? "Скрин загружен" : "Нужен скрин"}
                                </span>
                              )}
                            </div>

                            {template?.description && (
                              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                            )}

                            {item.completed && item.completedBy && (
                              <p className="text-xs text-gray-400 mt-1">
                                Выполнил: {item.completedBy.name || item.completedBy.login}
                                {item.completedAt && <> в {new Date(item.completedAt).toLocaleString("ru-RU")}</>}
                              </p>
                            )}

                            {hasFiles && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {item.files!.map((file) => (
                                  <div
                                    key={file.id}
                                    className="group relative flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                                  >
                                    {isImageFile(file) ? (
                                      <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                    )}

                                    <span
                                      className="text-sm text-gray-700 max-w-[120px] truncate"
                                      title={file.originalName}
                                    >
                                      {file.originalName}
                                    </span>

                                    <div className="flex items-center gap-1 ml-1">
                                      {isImageFile(file) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            dlog("👁 Eye button clicked for file:", file.id, file.originalName);
                                            handleOpenPreview(file);
                                          }}
                                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                          title="Просмотр"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          dlog("⬇ Download button clicked for file:", file.id, file.originalName);
                                          handleDownloadFile(file.id, file.originalName);
                                        }}
                                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                        title="Скачать"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>

                                      {!readOnly && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteFile(file.id, item.completed);
                                          }}
                                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="Удалить"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {requiresFile && !hasFiles && !item.completed && (
                              <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                Загрузите скриншот для выполнения этого этапа
                              </div>
                            )}
                          </div>

                          {!readOnly && (
                            <button
                              type="button"
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
                              Скрин
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

      {previewFile &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/90 flex flex-col"
            style={{ zIndex: 9999 }}
            onClick={handleClosePreview}
          >
            <div
              className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-white">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="font-medium">{previewFile.originalName}</p>
                  <p className="text-sm text-gray-400">{formatFileSize(previewFile.fileSize)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomOut();
                  }}
                  disabled={zoom <= 0.5}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                  title="Уменьшить"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>

                <span className="text-white/70 text-sm min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomIn();
                  }}
                  disabled={zoom >= 3}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                  title="Увеличить"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-white/20 mx-2" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRotate();
                  }}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Повернуть"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-white/20 mx-2" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadFile(previewFile.id, previewFile.originalName);
                  }}
                  className="p-2 text-white/70 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                  title="Скачать"
                >
                  <Download className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClosePreview();
                  }}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2"
                  title="Закрыть (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              className="flex-1 flex items-center justify-center overflow-hidden p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {previewLoading && (
                <div className="flex flex-col items-center gap-3 text-white">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                  <span className="text-gray-400">Загрузка...</span>
                </div>
              )}

              {previewError && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-white font-medium">Ошибка загрузки</p>
                  <p className="text-gray-400 text-sm">{previewError}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPreview(previewFile);
                    }}
                    className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Повторить
                  </button>
                </div>
              )}

              {previewUrl && !previewLoading && (
                <img
                  src={previewUrl}
                  alt={previewFile.originalName}
                  className="block object-contain select-none"
                  style={{
                    maxWidth: "96vw",
                    maxHeight: "calc(100dvh - 120px)",
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center center"
                  }}
                  draggable={false}
                />
              )}
            </div>

            <div className="text-center py-2 text-gray-500 text-sm bg-black/50">
              Нажмите в любом месте или Esc для закрытия
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ServerChecklistSection;
