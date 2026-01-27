/**
 * SettingsTab.tsx - Вкладка настроек Beryll
 * 
 * Обновлено: добавлено поле "Требуется скриншот" (requiresFile)
 * и Drag & Drop для изменения порядка этапов
 * 
 * Путь: src/pages/Beryll/tabs/SettingsTab.tsx
 */

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Server,
  ListChecks,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  GripVertical,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Camera,
  RotateCcw,
  Eye,
  EyeOff,
  FileImage
} from "lucide-react";
import {
  getChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  reorderChecklistTemplates,
  restoreChecklistTemplate,
  BeryllChecklistTemplate,
  ChecklistGroup,
  CHECKLIST_GROUP_LABELS
} from "src/api/beryllApi";

// Drag & Drop типы
interface DragItem {
  id: number;
  index: number;
}

export const SettingsTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"dhcp" | "checklists">("checklists");
  
  // Чек-листы
  const [templates, setTemplates] = useState<BeryllChecklistTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<BeryllChecklistTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    title: "",
    description: "",
    sortOrder: 0,
    isRequired: true,
    estimatedMinutes: 30,
    groupCode: "TESTING" as ChecklistGroup,
    fileCode: "",
    requiresFile: false
  });
  const [saving, setSaving] = useState(false);

  // Drag & Drop состояние
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await getChecklistTemplates(showInactive);
      setTemplates(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) {
      console.error("Ошибка загрузки шаблонов:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [showInactive]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      title: "",
      description: "",
      sortOrder: templates.length * 10,
      isRequired: true,
      estimatedMinutes: 30,
      groupCode: "TESTING",
      fileCode: "",
      requiresFile: false
    });
    setShowTemplateModal(true);
  };

  const openEditModal = (template: BeryllChecklistTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      title: template.title,
      description: template.description || "",
      sortOrder: template.sortOrder,
      isRequired: template.isRequired,
      estimatedMinutes: template.estimatedMinutes,
      groupCode: template.groupCode || "TESTING",
      fileCode: template.fileCode || "",
      requiresFile: template.requiresFile || false
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.title.trim()) {
      alert("Введите название этапа");
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        await updateChecklistTemplate(editingTemplate.id, templateForm);
      } else {
        await createChecklistTemplate(templateForm);
      }
      setShowTemplateModal(false);
      await loadTemplates();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: BeryllChecklistTemplate) => {
    const action = template.isActive ? "деактивировать" : "полностью удалить";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} этап "${template.title}"?`)) return;

    try {
      await deleteChecklistTemplate(template.id, !template.isActive);
      await loadTemplates();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка удаления");
    }
  };

  const handleRestoreTemplate = async (template: BeryllChecklistTemplate) => {
    try {
      await restoreChecklistTemplate(template.id);
      await loadTemplates();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка восстановления");
    }
  };

  // Drag & Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: number, index: number) => {
    setDraggedItem({ id, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML);
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDraggedItem(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.index === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    // Создаём новый порядок
    const newTemplates = [...templates];
    const [draggedTemplate] = newTemplates.splice(draggedItem.index, 1);
    newTemplates.splice(dropIndex, 0, draggedTemplate);

    // Обновляем локально для мгновенного отклика
    setTemplates(newTemplates);
    setDragOverIndex(null);

    // Отправляем на сервер
    try {
      const orderedIds = newTemplates.map(t => t.id);
      await reorderChecklistTemplates(orderedIds);
    } catch (e: any) {
      console.error("Ошибка изменения порядка:", e);
      // Откатываем при ошибке
      await loadTemplates();
    }
  }, [draggedItem, templates]);

  // Группировка шаблонов по группам
  const groupedTemplates = templates.reduce((acc, template) => {
    const group = template.groupCode || "TESTING";
    if (!acc[group]) acc[group] = [];
    acc[group].push(template);
    return acc;
  }, {} as Record<ChecklistGroup, BeryllChecklistTemplate[]>);

  const groupOrder: ChecklistGroup[] = ["VISUAL", "TESTING", "QC_PRIMARY", "BURN_IN", "QC_FINAL"];

  return (
    <div className="space-y-6">
      {/* Навигация по секциям */}
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveSection("checklists")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === "checklists"
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <ListChecks className="w-4 h-4" />
          Этапы работ (Чек-лист)
        </button>
        <button
          onClick={() => setActiveSection("dhcp")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === "dhcp"
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Server className="w-4 h-4" />
          Настройки DHCP
        </button>
      </div>

      {/* Секция: Чек-листы */}
      {activeSection === "checklists" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Этапы работ над сервером
              </h2>
              <p className="text-sm text-gray-500">
                Настройте чек-лист операций. Перетаскивайте этапы для изменения порядка.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  showInactive 
                    ? "bg-gray-200 text-gray-700" 
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showInactive ? "Скрыть неактивные" : "Показать неактивные"}
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Добавить этап
              </button>
            </div>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <ListChecks className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">Этапы работ не настроены</p>
              <button
                onClick={openCreateModal}
                className="text-indigo-600 hover:underline"
              >
                Добавить первый этап
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {groupOrder.map(groupCode => {
                const groupTemplates = groupedTemplates[groupCode];
                if (!groupTemplates || groupTemplates.length === 0) return null;

                return (
                  <div key={groupCode} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Заголовок группы */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-medium text-gray-700">
                        {CHECKLIST_GROUP_LABELS[groupCode]}
                      </h3>
                    </div>

                    {/* Элементы группы */}
                    <div className="divide-y divide-gray-100">
                      {groupTemplates.map((template, index) => {
                        const globalIndex = templates.findIndex(t => t.id === template.id);
                        
                        return (
                          <div
                            key={template.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, template.id, globalIndex)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, globalIndex)}
                            onDrop={(e) => handleDrop(e, globalIndex)}
                            className={`p-4 flex items-center gap-4 transition-all cursor-move ${
                              !template.isActive ? "opacity-50 bg-gray-50" : "hover:bg-gray-50"
                            } ${
                              dragOverIndex === globalIndex ? "border-t-2 border-indigo-500" : ""
                            }`}
                          >
                            {/* Порядок */}
                            <div className="flex items-center gap-2 text-gray-400">
                              <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
                              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </span>
                            </div>

                            {/* Информация */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-medium ${template.isActive ? "text-gray-800" : "text-gray-500"}`}>
                                  {template.title}
                                </span>
                                {template.isRequired && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-medium">
                                    ОБЯЗАТЕЛЬНЫЙ
                                  </span>
                                )}
                                {template.requiresFile && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-medium flex items-center gap-1">
                                    <Camera className="w-3 h-3" />
                                    СКРИН
                                  </span>
                                )}
                                {!template.isActive && (
                                  <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] rounded font-medium">
                                    НЕАКТИВЕН
                                  </span>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                                  {template.description}
                                </p>
                              )}
                              {template.fileCode && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Код файла: {template.fileCode}
                                </p>
                              )}
                            </div>

                            {/* Время */}
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              ~{template.estimatedMinutes} мин
                            </div>

                            {/* Действия */}
                            <div className="flex items-center gap-1">
                              {!template.isActive && (
                                <button
                                  onClick={() => handleRestoreTemplate(template)}
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Восстановить"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(template)}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title={template.isActive ? "Деактивировать" : "Удалить"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Подсказка */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Как работают этапы:</p>
              <ul className="mt-1 list-disc list-inside space-y-1 text-blue-600">
                <li>При взятии сервера в работу автоматически создаётся чек-лист</li>
                <li>Исполнитель отмечает выполненные этапы</li>
                <li>
                  <Camera className="w-3 h-3 inline mr-1" />
                  Этапы с пометкой <strong>"СКРИН"</strong> требуют загрузки скриншота
                </li>
                <li>Все отметки логируются в историю операций</li>
                <li>Обязательные этапы должны быть выполнены перед завершением</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Секция: DHCP */}
      {activeSection === "dhcp" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Настройки подключения к DHCP серверу
            </h2>
            <p className="text-sm text-gray-500">
              Параметры SSH-подключения для синхронизации lease-файла
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Хост */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DHCP сервер (IP)
                </label>
                <input
                  type="text"
                  value="10.11.0.10"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Изменяется в конфигурации сервера
                </p>
              </div>

              {/* Пользователь */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SSH пользователь
                </label>
                <input
                  type="text"
                  value="root"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              {/* Путь */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Путь к lease-файлу
                </label>
                <input
                  type="text"
                  value="/var/lib/kea/kea-leases4.csv"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingTemplate ? "Редактировать этап" : "Добавить этап"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название этапа *
                </label>
                <input
                  type="text"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  placeholder="Например: Визуальный контроль"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Подробное описание этапа..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Группа */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Группа
                </label>
                <select
                  value={templateForm.groupCode}
                  onChange={(e) => setTemplateForm({ ...templateForm, groupCode: e.target.value as ChecklistGroup })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {groupOrder.map(group => (
                    <option key={group} value={group}>
                      {CHECKLIST_GROUP_LABELS[group]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Время */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Оценочное время (минуты)
                </label>
                <input
                  type="number"
                  value={templateForm.estimatedMinutes}
                  onChange={(e) => setTemplateForm({ ...templateForm, estimatedMinutes: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Код файла */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Код файла (опционально)
                </label>
                <input
                  type="text"
                  value={templateForm.fileCode}
                  onChange={(e) => setTemplateForm({ ...templateForm, fileCode: e.target.value })}
                  placeholder="Например: sn_raid2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Используется для привязки загружаемых файлов
                </p>
              </div>

              {/* Чекбоксы */}
              <div className="space-y-3 pt-2">
                {/* Обязательный */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateForm.isRequired}
                    onChange={(e) => setTemplateForm({ ...templateForm, isRequired: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-gray-700">Обязательный этап</span>
                    <p className="text-xs text-gray-500">Должен быть выполнен перед завершением работы</p>
                  </div>
                </label>

                {/* Требуется скриншот */}
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50">
                  <input
                    type="checkbox"
                    checked={templateForm.requiresFile}
                    onChange={(e) => setTemplateForm({ ...templateForm, requiresFile: e.target.checked })}
                    className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-700">Требуется скриншот/доказательство</span>
                    </div>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Нельзя отметить выполненным без загрузки файла
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingTemplate ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;