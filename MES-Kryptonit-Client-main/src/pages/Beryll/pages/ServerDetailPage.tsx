import { useState, useEffect, useContext, useRef } from "react";
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
  Tag,
  Camera,
  Image,
  Trash2,
  Eye,
  X,
  AlertCircle,
  File as FileIcon,
  Loader2
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
  deleteChecklistFile,
  downloadFile,
  BeryllServer,
  BeryllServerChecklist,
  BeryllChecklistFile,
  ServerStatus,
  ChecklistGroup,
  STATUS_LABELS,
  STATUS_COLORS,
  HISTORY_ACTION_LABELS,
  CHECKLIST_GROUP_LABELS,
  formatDateTime,
  formatDuration
} from "src/api/beryllApi";
import { $authHost } from "src/api/index";

import { DefectComments } from '../../../components/beryll/DefectComments';
import ServerComponentsManager from '../../../components/beryll/ServerComponentsManager';


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
  
  // Для загрузки файлов
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingChecklistId, setUploadingChecklistId] = useState<number | null>(null);
  
  // Просмотр изображения
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Модалка загрузки файла с превью
  const [uploadModal, setUploadModal] = useState<{
    open: boolean;
    checklistId: number | null;
    checklistTitle: string;
    file: File | null;
    preview: string | null;
    fileName: string;
  }>({
    open: false,
    checklistId: null,
    checklistTitle: "",
    file: null,
    preview: null,
    fileName: ""
  });

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

  // Очистка blob URL при размонтировании
  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, []);

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

  const handleToggleChecklist = async (checklistId: number, completed: boolean, requiresFile: boolean, hasFiles: boolean) => {
    if (!server) return;
    
    // Валидация на клиенте
    if (completed && requiresFile && !hasFiles) {
      toast.error("Сначала загрузите скриншот для этого этапа");
      return;
    }
    
    try {
      await toggleChecklistItem(server.id, checklistId, completed);
      await loadServer();
      toast.success(completed ? "Этап выполнен" : "Отметка снята");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка");
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

  // Клик по кнопке загрузки файла — открывает модалку
  const handleUploadClick = (checklistTemplateId: number, checklistTitle: string) => {
    setUploadingChecklistId(checklistTemplateId);
    
    // Генерируем имя по умолчанию
    const now = new Date();
    const defaultName = `${checklistTitle.replace(/[^a-zа-яё0-9]/gi, "_")}_${now.toLocaleDateString("ru-RU").replace(/\./g, "-")}`;
    
    setUploadModal({
      open: true,
      checklistId: checklistTemplateId,
      checklistTitle,
      file: null,
      preview: null,
      fileName: defaultName
    });
  };

  // Выбрать файл через input
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Открыть модалку с файлом
  const openUploadModal = (checklistId: number, checklistTitle: string, file: File) => {
    const preview = file.type.startsWith("image/") 
      ? URL.createObjectURL(file) 
      : null;
    
    // Генерируем имя по умолчанию
    const now = new Date();
    const defaultName = `${checklistTitle.replace(/[^a-zа-яё0-9]/gi, "_")}_${now.toLocaleDateString("ru-RU").replace(/\./g, "-")}`;
    
    setUploadModal({
      open: true,
      checklistId,
      checklistTitle,
      file,
      preview,
      fileName: defaultName
    });
  };

  // Установить файл в модалку (из input или paste)
  const setFileToModal = (file: File) => {
    const preview = file.type.startsWith("image/") 
      ? URL.createObjectURL(file) 
      : null;
    
    // Освобождаем старый preview
    if (uploadModal.preview) {
      URL.revokeObjectURL(uploadModal.preview);
    }
    
    setUploadModal(prev => ({
      ...prev,
      file,
      preview
    }));
  };

  // Закрыть модалку
  const closeUploadModal = () => {
    if (uploadModal.preview) {
      URL.revokeObjectURL(uploadModal.preview);
    }
    setUploadModal({
      open: false,
      checklistId: null,
      checklistTitle: "",
      file: null,
      preview: null,
      fileName: ""
    });
    setUploadingChecklistId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Подтверждение загрузки из модалки
  const confirmUpload = async () => {
    console.log("confirmUpload called", {
      server: !!server,
      file: uploadModal.file,
      checklistId: uploadModal.checklistId,
      fileName: uploadModal.fileName
    });
    
    if (!server || !uploadModal.file || !uploadModal.checklistId) {
      console.log("Missing required data", { server: !!server, file: !!uploadModal.file, checklistId: uploadModal.checklistId });
      toast.error("Файл не выбран");
      return;
    }
    
    try {
      // Создаём новый файл с пользовательским именем
      const ext = uploadModal.file.name.split(".").pop() || "png";
      const newFileName = `${uploadModal.fileName}.${ext}`;
      const renamedFile = new File([uploadModal.file], newFileName, { type: uploadModal.file.type });
      
      console.log("Uploading file:", {
        serverId: server.id,
        checklistId: uploadModal.checklistId,
        fileName: newFileName,
        fileType: renamedFile.type,
        fileSize: renamedFile.size
      });
      
      await uploadChecklistFile(server.id, uploadModal.checklistId, renamedFile);
      toast.success("Файл загружен");
      closeUploadModal();
      await loadServer();
    } catch (e: any) {
      console.error("Upload error:", e);
      console.error("Error response:", e.response);
      toast.error(e.response?.data?.message || e.message || "Ошибка загрузки файла");
    }
  };

  // Обработчик вставки из буфера (Ctrl+V) — работает когда модалка открыта
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Работает только когда модалка открыта
      if (!uploadModal.open) return;
      
      // Игнорируем если фокус в input названия
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "INPUT" && (activeEl as HTMLInputElement).type === "text") {
        return;
      }
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setFileToModal(file);
            toast.success("Изображение вставлено из буфера");
          }
          break;
        }
      }
    };
    
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [uploadModal.open, uploadModal.preview]);

  // Загрузка файла через input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Валидация типа
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Разрешены только изображения (JPG, PNG, GIF, WEBP) и PDF");
      return;
    }
    
    // Валидация размера (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Максимальный размер файла 5 МБ");
      return;
    }
    
    setFileToModal(file);
    
    // Сбрасываем input для повторного выбора того же файла
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Удаление файла
  const handleDeleteFile = async (fileId: number) => {
    if (!confirm("Удалить файл?")) return;
    
    try {
      await deleteChecklistFile(fileId);
      toast.success("Файл удалён");
      await loadServer();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка удаления");
    }
  };

  // Просмотр файла - ИСПРАВЛЕНО: загрузка через авторизованный запрос
  const handleViewFile = async (fileId: number, mimetype?: string) => {
    if (mimetype?.startsWith("image/")) {
      // Освобождаем предыдущий blob URL
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
        setPreviewImage(null);
      }
      
      setPreviewLoading(true);
      
      try {
        const response = await $authHost.get(`/api/beryll/files/${fileId}`, {
          responseType: 'blob'
        });
        const url = URL.createObjectURL(response.data);
        setPreviewImage(url);
      } catch (e: any) {
        console.error("Ошибка загрузки изображения:", e);
        toast.error("Не удалось загрузить изображение");
      } finally {
        setPreviewLoading(false);
      }
    } else {
      // Для PDF и других файлов - скачиваем через авторизованный запрос
      try {
        const response = await $authHost.get(`/api/beryll/files/${fileId}`, {
          responseType: 'blob'
        });
        const url = URL.createObjectURL(response.data);
        window.open(url, "_blank");
        // Освобождаем URL после небольшой задержки
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e: any) {
        console.error("Ошибка загрузки файла:", e);
        toast.error("Не удалось загрузить файл");
      }
    }
  };

  // Закрытие превью с освобождением blob URL
  const handleClosePreview = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
  };

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

  // Группировка чек-листа по groupCode
  const groupedChecklists = () => {
    if (!server?.checklists) return {};
    
    const groups: Record<string, BeryllServerChecklist[]> = {};
    
    server.checklists
      .sort((a, b) => (a.template?.sortOrder || 0) - (b.template?.sortOrder || 0))
      .forEach(item => {
        const groupCode = item.template?.groupCode || "OTHER";
        if (!groups[groupCode]) {
          groups[groupCode] = [];
        }
        groups[groupCode].push(item);
      });
    
    return groups;
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
  const groups = groupedChecklists();

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Скрытый input для загрузки файлов */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Модалка просмотра изображения - ИСПРАВЛЕНО */}
      {(previewImage || previewLoading) && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={handleClosePreview}
        >
          <button
            onClick={handleClosePreview}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          
          {previewLoading ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
              <span className="text-gray-400">Загрузка...</span>
            </div>
          ) : previewImage ? (
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
      )}

      {/* Модалка загрузки файла с превью и названием */}
      {uploadModal.open && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeUploadModal}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Загрузка скриншота
              </h3>
              <button
                onClick={closeUploadModal}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Этап */}
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Этап:</span> {uploadModal.checklistTitle}
              </p>
            </div>
            
            {/* Зона для файла */}
            {!uploadModal.file ? (
              <div className="mb-4">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                  onClick={handleSelectFile}
                >
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium mb-1">
                    Выберите файл или вставьте из буфера
                  </p>
                  <p className="text-sm text-gray-500">
                    Нажмите сюда или используйте <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl+V</kbd>
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectFile();
                    }}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    Выбрать файл
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  JPG, PNG, GIF, WEBP или PDF • до 5 МБ
                </p>
              </div>
            ) : (
              <>
                {/* Превью изображения */}
                {uploadModal.preview && (
                  <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden bg-gray-100 relative group">
                    <img 
                      src={uploadModal.preview} 
                      alt="Preview" 
                      className="max-h-64 w-full object-contain"
                    />
                    <button
                      onClick={() => setUploadModal(prev => ({ ...prev, file: null, preview: null }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Если PDF */}
                {uploadModal.file && !uploadModal.preview && (
                  <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-3 relative group">
                    <FileIcon className="w-8 h-8 text-red-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{uploadModal.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(uploadModal.file.size / 1024).toFixed(1)} КБ
                      </p>
                    </div>
                    <button
                      onClick={() => setUploadModal(prev => ({ ...prev, file: null, preview: null }))}
                      className="p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Название файла */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название файла
                  </label>
                  <input
                    type="text"
                    value={uploadModal.fileName}
                    onChange={(e) => setUploadModal(prev => ({ ...prev, fileName: e.target.value }))}
                    placeholder="Введите название"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && uploadModal.file) {
                        confirmUpload();
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Расширение файла добавится автоматически
                  </p>
                </div>
              </>
            )}
            
            {/* Кнопки */}
            <div className="flex justify-end gap-2">
              <button
                onClick={closeUploadModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={confirmUpload}
                disabled={!uploadModal.file || !uploadModal.fileName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Загрузить
              </button>
            </div>
          </div>
        </div>
      )}

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
                  onClick={() => copyToClipboard(server.ipAddress!)}
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

            <button
              onClick={handleDownloadPassport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              title="Скачать паспорт"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Паспорт
            </button>

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

            {/* Серийный номер АПК */}
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

          {/* Чек-лист с загрузкой файлов */}
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
                {/* Прогресс-бар */}
                {checklistTotal > 0 && (
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(checklistCompleted / checklistTotal) * 100}%` }}
                    />
                  </div>
                )}
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
                  <div className="space-y-4 pt-4">
                    {Object.entries(groups).map(([groupCode, items]) => (
                      <div key={groupCode} className="space-y-2">
                        {/* Заголовок группы */}
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2">
                          {CHECKLIST_GROUP_LABELS[groupCode as ChecklistGroup] || groupCode}
                        </h4>
                        
                        {/* Пункты группы */}
                        <div className="space-y-2">
                          {items.map((item) => {
                            const requiresFile = item.template?.requiresFile || false;
                            const files = item.files || [];
                            const hasFiles = files.length > 0;
                            
                            return (
                              <div
                                key={item.id || item.checklistTemplateId}
                                className={`p-3 rounded-lg border ${
                                  item.completed 
                                    ? "bg-green-50 border-green-200" 
                                    : requiresFile && !hasFiles
                                      ? "bg-amber-50 border-amber-200"
                                      : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Чекбокс */}
                                  <button
                                    onClick={() => handleToggleChecklist(
                                      item.checklistTemplateId,
                                      !item.completed,
                                      requiresFile,
                                      hasFiles
                                    )}
                                    disabled={!canWork}
                                    className={`mt-0.5 w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                      item.completed
                                        ? "bg-green-500 border-green-500 text-white"
                                        : canWork
                                          ? "border-gray-300 hover:border-indigo-500"
                                          : "border-gray-200 bg-gray-100"
                                    }`}
                                  >
                                    {item.completed && <CheckCircle2 className="w-4 h-4" />}
                                  </button>
                                  
                                  {/* Содержимое */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium ${
                                        item.completed ? "text-green-700" : "text-gray-800"
                                      }`}>
                                        {item.template?.title}
                                      </span>
                                      
                                      {/* Индикатор "требуется скриншот" */}
                                      {requiresFile && !item.completed && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                                          hasFiles 
                                            ? "bg-green-100 text-green-700" 
                                            : "bg-amber-100 text-amber-700"
                                        }`}>
                                          <Camera className="w-3 h-3" />
                                          {hasFiles ? "Скрин загружен" : "Нужен скрин"}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {item.template?.description && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {item.template.description}
                                      </p>
                                    )}
                                    
                                    {/* Загруженные файлы */}
                                    {hasFiles && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {files.map((file) => (
                                          <div 
                                            key={file.id}
                                            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                                          >
                                            {file.mimetype?.startsWith("image/") ? (
                                              <Image className="w-3 h-3 text-blue-500" />
                                            ) : (
                                              <FileIcon className="w-3 h-3 text-red-500" />
                                            )}
                                            <span className="max-w-[100px] truncate" title={file.originalName}>
                                              {file.originalName}
                                            </span>
                                            <button
                                              onClick={() => {
                                                console.log("👁 ServerDetailPage Eye clicked:", file.id, file.mimetype);
                                                handleViewFile(file.id, file.mimetype);
                                              }}
                                              className="p-0.5 text-gray-400 hover:text-blue-600"
                                              title="Просмотреть"
                                            >
                                              <Eye className="w-3 h-3" />
                                            </button>
                                            {canWork && (
                                              <button
                                                onClick={() => handleDeleteFile(file.id)}
                                                className="p-0.5 text-gray-400 hover:text-red-600"
                                                title="Удалить"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Кто выполнил */}
                                    {item.completed && item.completedBy && (
                                      <p className="text-xs text-green-600 mt-1">
                                        ✓ {item.completedBy.surname} {item.completedBy.name?.charAt(0)}. — {formatDateTime(item.completedAt)}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Кнопка загрузки файла */}
                                  {canWork && !item.completed && (
                                    <button
                                      onClick={() => handleUploadClick(item.checklistTemplateId, item.template?.title || "Скриншот")}
                                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                        requiresFile && !hasFiles
                                          ? "bg-amber-500 text-white hover:bg-amber-600"
                                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                      }`}
                                      title="Загрузить скриншот (или Ctrl+V)"
                                    >
                                      <Upload className="w-4 h-4" />
                                      <span className="hidden sm:inline">Скрин</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Комплектующие */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <ServerComponentsManager 
              serverId={server.id} 
              serverIp={server.ipAddress}
              apkSerialNumber={server.apkSerialNumber}
              readOnly={server.status === "ARCHIVED"}
            />
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
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

                    <div className="space-y-4 pt-4">
                      {server.history.map((item) => (
                        <div key={item.id} className="relative pl-8">
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

        {/* Правая колонка */}
        <div className="space-y-6">
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