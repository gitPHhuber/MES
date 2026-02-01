/**
 * RacksTab.tsx
 * 
 * Вкладка "Стойки" для APK Beryll
 * Отображает физическое размещение серверов в стойках
 * 
 * ОБНОВЛЕНО: Модалка установки с автопоиском - сначала ищет существующий сервер,
 * если не найден - создаёт новый
 * 
 * Положить в: src/pages/Beryll/tabs/RacksTab.tsx
 */

import React, { useState, useEffect } from "react";
import { 
  Server, Plus, Search, MapPin, Wifi, 
  Trash2, Edit, Move, CheckCircle, XCircle, PlusCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  getRacks, getRackById, createRack, updateRack, deleteRack,
  installServerInRack, removeServerFromRack,
  createAndPlaceServer, findServerInDhcp,
  BeryllRack, BeryllRackUnit, RackStatus
} from "../../../api/beryll/beryllExtendedApi";
import { getServers } from "../../../api/beryllApi";
import { Modal } from "../../../components/Modal/Modal";
import { ConfirmModal } from "../../../components/Modal/ConfirmModal";

// Статусы стоек с цветами
const RACK_STATUS_CONFIG: Record<RackStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Активна", color: "text-green-600", bg: "bg-green-100" },
  MAINTENANCE: { label: "Обслуживание", color: "text-yellow-600", bg: "bg-yellow-100" },
  DECOMMISSIONED: { label: "Выведена", color: "text-gray-600", bg: "bg-gray-100" }
};

const RacksTab: React.FC = () => {
  const [racks, setRacks] = useState<BeryllRack[]>([]);
  const [selectedRack, setSelectedRack] = useState<BeryllRack | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Модальные окна
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Выбранный юнит для операций
  const [selectedUnit, setSelectedUnit] = useState<BeryllRackUnit | null>(null);
  
  // Серверы для выбора
  const [availableServers, setAvailableServers] = useState<any[]>([]);
  
  // Загрузка стоек
  const loadRacks = async () => {
    try {
      setLoading(true);
      const data = await getRacks({ search, includeUnits: false });
      setRacks(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка загрузки стоек");
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка деталей стойки
  const loadRackDetails = async (rackId: number) => {
    try {
      const data = await getRackById(rackId);
      setSelectedRack(data);
    } catch (error: any) {
      toast.error("Ошибка загрузки данных стойки");
    }
  };
  
  // Загрузка доступных серверов
  const loadAvailableServers = async () => {
    try {
      const data = await getServers({});
      setAvailableServers(data);
    } catch (error) {
      console.error("Ошибка загрузки серверов:", error);
    }
  };
  
  useEffect(() => {
    loadRacks();
  }, [search]);
  
  useEffect(() => {
    if (showInstallModal) {
      loadAvailableServers();
    }
  }, [showInstallModal]);
  
  // Рендер юнита стойки
  const renderUnit = (unit: BeryllRackUnit) => {
    const isEmpty = !unit.serverId;
    
    return (
      <div
        key={unit.id}
        className={`
          p-2 border rounded cursor-pointer transition-all
          ${isEmpty 
            ? "border-dashed border-gray-300 bg-gray-50 hover:border-blue-400" 
            : "border-solid border-gray-400 bg-white hover:border-blue-500 hover:shadow"
          }
        `}
        onClick={() => {
          setSelectedUnit(unit);
          if (isEmpty) {
            setShowInstallModal(true);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500">U{unit.unitNumber}</span>
          {!isEmpty && (
            <div className="flex gap-1">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm("Извлечь сервер из юнита?")) {
                    try {
                      await removeServerFromRack(unit.rackId, unit.unitNumber);
                      toast.success("Сервер извлечён");
                      loadRackDetails(unit.rackId);
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || "Ошибка");
                    }
                  }
                }}
                className="p-1 hover:bg-red-100 rounded text-red-500"
                title="Извлечь"
              >
                <XCircle size={12} />
              </button>
            </div>
          )}
        </div>
        
        {!isEmpty && unit.server && (
          <div className="mt-1">
            <div className="text-xs font-medium truncate" title={unit.server.apkSerialNumber}>
              {unit.server.apkSerialNumber || `#${unit.server.id}`}
            </div>
            {unit.hostname && (
              <div className="text-xs text-gray-500 truncate">{unit.hostname}</div>
            )}
            {unit.mgmtIpAddress && (
              <div className="text-xs text-blue-500 truncate">{unit.mgmtIpAddress}</div>
            )}
          </div>
        )}
        
        {isEmpty && (
          <div className="text-xs text-gray-400 text-center mt-1">Пусто</div>
        )}
      </div>
    );
  };
  
  // Компонент визуализации стойки
  const RackVisualization: React.FC<{ rack: BeryllRack }> = ({ rack }) => {
    if (!rack.units || rack.units.length === 0) {
      return <div className="text-gray-500">Юниты не загружены</div>;
    }
    
    // Сортируем юниты по номеру (сверху вниз, т.е. от большего к меньшему)
    const sortedUnits = [...rack.units].sort((a, b) => b.unitNumber - a.unitNumber);
    
    return (
      <div className="grid grid-cols-1 gap-1 max-h-[600px] overflow-y-auto">
        {sortedUnits.map(unit => renderUnit(unit))}
      </div>
    );
  };
  
  return (
    <div className="p-4">
      {/* Заголовок и поиск */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Server className="text-blue-600" />
          Стойки
        </h2>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Поиск стоек..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Добавить стойку
          </button>
        </div>
      </div>
      
      <div className="flex gap-4">
        {/* Список стоек */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-lg shadow">
            <div className="p-3 border-b font-medium text-gray-700">
              Список стоек ({racks.length})
            </div>
            
            {loading ? (
              <div className="p-4 text-center text-gray-500">Загрузка...</div>
            ) : racks.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Стойки не найдены</div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {racks.map(rack => (
                  <div
                    key={rack.id}
                    className={`
                      p-3 cursor-pointer hover:bg-gray-50 transition-colors
                      ${selectedRack?.id === rack.id ? "bg-blue-50 border-l-4 border-blue-500" : ""}
                    `}
                    onClick={() => loadRackDetails(rack.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{rack.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${RACK_STATUS_CONFIG[rack.status].bg} ${RACK_STATUS_CONFIG[rack.status].color}`}>
                        {RACK_STATUS_CONFIG[rack.status].label}
                      </span>
                    </div>
                    
                    {rack.location && (
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin size={12} />
                        {rack.location}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Юнитов: {rack.totalUnits}</span>
                      {rack.filledUnits !== undefined && (
                        <span>Занято: {rack.filledUnits}</span>
                      )}
                      {rack.occupancyPercent !== undefined && (
                        <span className="text-blue-600">{rack.occupancyPercent}%</span>
                      )}
                    </div>
                    
                    {/* Прогресс-бар заполненности */}
                    {rack.occupancyPercent !== undefined && (
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${rack.occupancyPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Детали выбранной стойки */}
        <div className="flex-1">
          {selectedRack ? (
            <div className="bg-white rounded-lg shadow">
              {/* Заголовок стойки */}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedRack.name}</h3>
                  {selectedRack.location && (
                    <p className="text-sm text-gray-500">{selectedRack.location}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Редактировать"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 hover:bg-red-100 text-red-500 rounded-lg"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {/* Информация о сети */}
              {(selectedRack.networkSubnet || selectedRack.gateway) && (
                <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-4 text-sm">
                  <Wifi size={16} className="text-gray-400" />
                  {selectedRack.networkSubnet && <span>Subnet: {selectedRack.networkSubnet}</span>}
                  {selectedRack.gateway && <span>Gateway: {selectedRack.gateway}</span>}
                </div>
              )}
              
              {/* Визуализация стойки */}
              <div className="p-4">
                <RackVisualization rack={selectedRack} />
              </div>
              
              {/* Примечания */}
              {selectedRack.notes && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-yellow-50 rounded-lg text-sm">
                    <strong>Примечания:</strong> {selectedRack.notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <Server size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Выберите стойку для просмотра</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Модальное окно создания стойки */}
      <CreateRackModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadRacks();
          setShowCreateModal(false);
        }}
      />
      
      {/* Модальное окно редактирования стойки */}
      {selectedRack && (
        <EditRackModal
          isOpen={showEditModal}
          rack={selectedRack}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadRacks();
            loadRackDetails(selectedRack.id);
            setShowEditModal(false);
          }}
        />
      )}
      
      {/* Модальное окно установки сервера */}
      {selectedUnit && selectedRack && (
        <InstallServerModal
          isOpen={showInstallModal}
          rack={selectedRack}
          unit={selectedUnit}
          servers={availableServers}
          onClose={() => {
            setShowInstallModal(false);
            setSelectedUnit(null);
          }}
          onSuccess={() => {
            loadRackDetails(selectedRack.id);
            setShowInstallModal(false);
            setSelectedUnit(null);
          }}
        />
      )}
      
      {/* Подтверждение удаления */}
      {selectedRack && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Удалить стойку?"
          message={`Вы уверены, что хотите удалить стойку "${selectedRack.name}"?`}
          onConfirm={async () => {
            try {
              await deleteRack(selectedRack.id);
              toast.success("Стойка удалена");
              setSelectedRack(null);
              loadRacks();
            } catch (error: any) {
              toast.error(error.response?.data?.message || "Ошибка удаления");
            }
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};

// ============================================
// МОДАЛЬНОЕ ОКНО СОЗДАНИЯ СТОЙКИ
// ============================================

interface CreateRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateRackModal: React.FC<CreateRackModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "",
    location: "",
    totalUnits: 42,
    networkSubnet: "",
    gateway: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error("Введите название стойки");
      return;
    }
    
    try {
      setSaving(true);
      await createRack(form);
      toast.success("Стойка создана");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка создания");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать стойку">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="BL0206-240001"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Расположение</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Стеллаж 1, у щитка"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Количество юнитов</label>
          <input
            type="number"
            value={form.totalUnits}
            onChange={(e) => setForm({ ...form, totalUnits: parseInt(e.target.value) || 42 })}
            min={1}
            max={50}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subnet</label>
            <input
              type="text"
              value={form.networkSubnet}
              onChange={(e) => setForm({ ...form, networkSubnet: e.target.value })}
              placeholder="10.10.0.0/24"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gateway</label>
            <input
              type="text"
              value={form.gateway}
              onChange={(e) => setForm({ ...form, gateway: e.target.value })}
              placeholder="10.10.0.1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Примечания</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ СТОЙКИ
// ============================================

interface EditRackModalProps {
  isOpen: boolean;
  rack: BeryllRack;
  onClose: () => void;
  onSuccess: () => void;
}

const EditRackModal: React.FC<EditRackModalProps> = ({ isOpen, rack, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: rack.name,
    location: rack.location || "",
    networkSubnet: rack.networkSubnet || "",
    gateway: rack.gateway || "",
    status: rack.status,
    notes: rack.notes || ""
  });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setForm({
      name: rack.name,
      location: rack.location || "",
      networkSubnet: rack.networkSubnet || "",
      gateway: rack.gateway || "",
      status: rack.status,
      notes: rack.notes || ""
    });
  }, [rack]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await updateRack(rack.id, form);
      toast.success("Стойка обновлена");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка обновления");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать стойку">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Расположение</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Статус</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as RackStatus })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(RACK_STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subnet</label>
            <input
              type="text"
              value={form.networkSubnet}
              onChange={(e) => setForm({ ...form, networkSubnet: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gateway</label>
            <input
              type="text"
              value={form.gateway}
              onChange={(e) => setForm({ ...form, gateway: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Примечания</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// МОДАЛЬНОЕ ОКНО УСТАНОВКИ СЕРВЕРА
// Логика: сначала ищем существующий, если нет - создаём новый
// ============================================

interface InstallServerModalProps {
  isOpen: boolean;
  rack: BeryllRack;
  unit: BeryllRackUnit;
  servers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const InstallServerModal: React.FC<InstallServerModalProps> = ({ 
  isOpen, rack, unit, servers, onClose, onSuccess 
}) => {
  const [form, setForm] = useState({
    serverId: 0,
    apkSerialNumber: "",
    hostname: "",
    mgmtMacAddress: "",
    mgmtIpAddress: "",
    dataMacAddress: "",
    dataIpAddress: "",
    accessLogin: "admin",
    accessPassword: "V36man",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dhcpInfo, setDhcpInfo] = useState<any>(null);
  const [searchingDhcp, setSearchingDhcp] = useState(false);
  
  // Поиск существующих серверов по введённому запросу
  const filteredServers = servers.filter(s => 
    searchQuery.length >= 2 && (
      s.apkSerialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ipAddress?.includes(searchQuery)
    )
  );
  
  // Найден ли существующий сервер с точным совпадением
  const exactMatch = servers.find(s => 
    s.apkSerialNumber?.toUpperCase() === searchQuery.toUpperCase() ||
    s.serialNumber?.toUpperCase() === searchQuery.toUpperCase()
  );
  
  // Показывать список серверов
  const showServerList = searchQuery.length >= 2 && filteredServers.length > 0;
  
  // Поиск в DHCP по серийнику
  const searchInDhcp = async () => {
    if (!searchQuery) {
      toast.error("Введите серийный номер");
      return;
    }
    
    try {
      setSearchingDhcp(true);
      const result = await findServerInDhcp(searchQuery);
      setDhcpInfo(result);
      
      if (result.found) {
        toast.success("Найден в DHCP!");
        // Заполняем данные из DHCP
        setForm(prev => ({
          ...prev,
          mgmtMacAddress: result.macAddress || prev.mgmtMacAddress,
          mgmtIpAddress: result.ipAddress || prev.mgmtIpAddress,
          hostname: result.hostname || prev.hostname
        }));
      } else {
        toast.info("Не найден в DHCP");
      }
    } catch (error: any) {
      toast.error("Ошибка поиска в DHCP");
      console.error(error);
    } finally {
      setSearchingDhcp(false);
    }
  };
  
  // Выбор существующего сервера
  const selectServer = (server: any) => {
    setForm(prev => ({ 
      ...prev, 
      serverId: server.id,
      hostname: server.hostname || prev.hostname,
      mgmtIpAddress: server.ipAddress || prev.mgmtIpAddress,
      mgmtMacAddress: server.macAddress || prev.mgmtMacAddress
    }));
    setSearchQuery(server.apkSerialNumber || server.serialNumber || `#${server.id}`);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery) {
      toast.error("Введите серийный номер");
      return;
    }
    
    try {
      setSaving(true);
      
      if (form.serverId) {
        // Устанавливаем существующий сервер
        await installServerInRack(rack.id, unit.unitNumber, {
          serverId: form.serverId,
          hostname: form.hostname,
          mgmtMacAddress: form.mgmtMacAddress,
          mgmtIpAddress: form.mgmtIpAddress,
          dataMacAddress: form.dataMacAddress,
          dataIpAddress: form.dataIpAddress,
          accessLogin: form.accessLogin,
          accessPassword: form.accessPassword,
          notes: form.notes
        });
        toast.success("Сервер установлен");
      } else {
        // Создаём новый сервер и сразу устанавливаем в стойку
        await createAndPlaceServer({
          apkSerialNumber: searchQuery.toUpperCase(),
          macAddress: form.mgmtMacAddress || undefined,
          hostname: form.hostname || undefined,
          rackId: rack.id,
          unitNumber: unit.unitNumber,
          unitData: {
            hostname: form.hostname,
            mgmtMacAddress: form.mgmtMacAddress,
            mgmtIpAddress: form.mgmtIpAddress,
            dataMacAddress: form.dataMacAddress,
            dataIpAddress: form.dataIpAddress,
            accessLogin: form.accessLogin,
            accessPassword: form.accessPassword,
            notes: form.notes
          }
        });
        toast.success("Сервер создан и установлен");
      }
      
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка установки");
    } finally {
      setSaving(false);
    }
  };
  
  // Сброс формы при открытии
  useEffect(() => {
    if (isOpen) {
      setForm({
        serverId: 0,
        apkSerialNumber: "",
        hostname: "",
        mgmtMacAddress: "",
        mgmtIpAddress: "",
        dataMacAddress: "",
        dataIpAddress: "",
        accessLogin: "admin",
        accessPassword: "V36man",
        notes: ""
      });
      setSearchQuery("");
      setDhcpInfo(null);
    }
  }, [isOpen]);
  
  // Сброс выбора при изменении поиска
  useEffect(() => {
    if (!exactMatch) {
      setForm(prev => ({ ...prev, serverId: 0 }));
    }
  }, [searchQuery]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Установить сервер в ${rack.name} / Unit ${unit.unitNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Поле ввода серийника */}
        <div>
          <label className="block text-sm font-medium mb-1">Серийный номер *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              placeholder="Введите серийник..."
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={searchInDhcp}
              disabled={searchingDhcp || !searchQuery}
              className="px-3 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200 disabled:opacity-50"
              title="Найти в DHCP"
            >
              {searchingDhcp ? "..." : <Wifi size={18} />}
            </button>
          </div>
        </div>
        
        {/* Список найденных серверов */}
        {showServerList && (
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-600">
              Найденные серверы ({filteredServers.length})
            </div>
            <div className="max-h-32 overflow-y-auto">
              {filteredServers.slice(0, 10).map(server => (
                <div
                  key={server.id}
                  className={`
                    p-2 cursor-pointer hover:bg-blue-50 border-b last:border-b-0
                    ${form.serverId === server.id ? "bg-blue-100" : ""}
                  `}
                  onClick={() => selectServer(server)}
                >
                  <div className="font-medium">{server.apkSerialNumber || server.serialNumber || `#${server.id}`}</div>
                  <div className="text-xs text-gray-500">
                    {server.hostname && `${server.hostname} • `}
                    {server.ipAddress || "IP не задан"} • 
                    <span className={`ml-1 ${server.status === "DONE" ? "text-green-600" : "text-yellow-600"}`}>
                      {server.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Статус: выбран существующий или создаём новый */}
        {searchQuery.length >= 2 && (
          <div className={`p-3 rounded-lg text-sm ${
            form.serverId 
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}>
            {form.serverId ? (
              <>
                <CheckCircle size={16} className="inline mr-1" />
                Выбран существующий сервер
              </>
            ) : (
              <>
                <PlusCircle size={16} className="inline mr-1" />
                Будет создан новый сервер: <strong>{searchQuery}</strong>
              </>
            )}
          </div>
        )}
        
        {/* Информация из DHCP */}
        {dhcpInfo && dhcpInfo.found && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <div className="font-medium text-green-800 mb-1">✓ Найден в DHCP:</div>
            <div className="text-green-700">
              IP: {dhcpInfo.ipAddress} • MAC: {dhcpInfo.macAddress}
              {dhcpInfo.hostname && ` • Hostname: ${dhcpInfo.hostname}`}
            </div>
          </div>
        )}
        
        {/* Hostname в кластере */}
        <div>
          <label className="block text-sm font-medium mb-1">Hostname в кластере</label>
          <input
            type="text"
            value={form.hostname}
            onChange={(e) => setForm({ ...form, hostname: e.target.value })}
            placeholder="cl1-worker1"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        {/* Сетевые настройки */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">MGMT MAC</label>
            <input
              type="text"
              value={form.mgmtMacAddress}
              onChange={(e) => setForm({ ...form, mgmtMacAddress: e.target.value })}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">MGMT IP</label>
            <input
              type="text"
              value={form.mgmtIpAddress}
              onChange={(e) => setForm({ ...form, mgmtIpAddress: e.target.value })}
              placeholder="10.10.0.10"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">DATA MAC</label>
            <input
              type="text"
              value={form.dataMacAddress}
              onChange={(e) => setForm({ ...form, dataMacAddress: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">DATA IP</label>
            <input
              type="text"
              value={form.dataIpAddress}
              onChange={(e) => setForm({ ...form, dataIpAddress: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        {/* Доступ */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Login</label>
            <input
              type="text"
              value={form.accessLogin}
              onChange={(e) => setForm({ ...form, accessLogin: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="text"
              value={form.accessPassword}
              onChange={(e) => setForm({ ...form, accessPassword: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving || !searchQuery}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Установка..." : form.serverId ? "Установить" : "Создать и установить"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RacksTab;