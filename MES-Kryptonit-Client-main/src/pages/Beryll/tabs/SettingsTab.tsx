import { useState, useEffect } from "react";
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
  AlertCircle
} from "lucide-react";
import {
  getChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  BeryllChecklistTemplate
} from "src/api/beryllApi";

export const SettingsTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<"dhcp" | "checklists">("checklists");
  
  // Чек-листы
  const [templates, setTemplates] = useState<BeryllChecklistTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<BeryllChecklistTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    title: "",
    description: "",
    sortOrder: 0,
    isRequired: true,
    estimatedMinutes: 30
  });
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await getChecklistTemplates();
      setTemplates(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) {
      console.error("Ошибка загрузки шаблонов:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      title: "",
      description: "",
      sortOrder: templates.length * 10,
      isRequired: true,
      estimatedMinutes: 30
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
      estimatedMinutes: template.estimatedMinutes
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
    if (!confirm(`Удалить этап "${template.title}"?`)) return;

    try {
      await deleteChecklistTemplate(template.id);
      await loadTemplates();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка удаления");
    }
  };

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
                Настройте чек-лист операций, которые выполняются для каждого сервера
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Добавить этап
            </button>
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {templates.map((template, index) => (
                  <div
                    key={template.id}
                    className="p-4 flex items-center gap-4 hover:bg-gray-50"
                  >
                    {/* Порядок */}
                    <div className="flex items-center gap-2 text-gray-400">
                      <GripVertical className="w-4 h-4" />
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                    </div>

                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">
                          {template.title}
                        </span>
                        {template.isRequired && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-medium">
                            ОБЯЗАТЕЛЬНЫЙ
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                          {template.description}
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
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

              {/* Путь к файлу */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Путь к lease-файлу
                </label>
                <input
                  type="text"
                  value="/var/lib/dhcp/dhcpd.leases"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                />
              </div>
            </div>

            {/* Статус подключения */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-gray-600">
                  Подключение настроено. Используйте кнопку "Синхронизация с DHCP" для обновления данных.
                </span>
              </div>
            </div>
          </div>

          {/* Информация */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Важно:</p>
              <ul className="mt-1 list-disc list-inside space-y-1 text-yellow-600">
                <li>SSH-пароль должен быть установлен в переменной окружения DHCP_SSH_PASSWORD</li>
                <li>Рекомендуется использовать SSH-ключи вместо пароля</li>
                <li>Убедитесь, что сервер MES имеет сетевой доступ к DHCP серверу</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания/редактирования шаблона */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingTemplate ? "Редактирование этапа" : "Новый этап работ"}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название этапа *
                </label>
                <input
                  type="text"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  placeholder="Например: Проверка питания"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                  placeholder="Подробное описание операции..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Порядок */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Порядок
                  </label>
                  <input
                    type="number"
                    value={templateForm.sortOrder}
                    onChange={(e) => setTemplateForm({ ...templateForm, sortOrder: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Время */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время (мин)
                  </label>
                  <input
                    type="number"
                    value={templateForm.estimatedMinutes}
                    onChange={(e) => setTemplateForm({ ...templateForm, estimatedMinutes: parseInt(e.target.value) || 30 })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Обязательный */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateForm.isRequired}
                  onChange={(e) => setTemplateForm({ ...templateForm, isRequired: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600"
                />
                <div>
                  <span className="font-medium text-gray-800">Обязательный этап</span>
                  <p className="text-xs text-gray-500">
                    Должен быть выполнен перед завершением работы
                  </p>
                </div>
              </label>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
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
                <Save className="w-4 h-4" />
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
