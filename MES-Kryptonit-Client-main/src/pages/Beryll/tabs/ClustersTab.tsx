/**
 * ClustersTab.tsx
 * 
 * Вкладка "Кластеры и Комплекты" для APK Beryll
 * Логическая группировка серверов для отгрузки
 * 
 * Положить в: src/pages/Beryll/tabs/ClustersTab.tsx
 */

import React, { useState, useEffect } from "react";
import { 
  Boxes, Plus, Search, Truck, Package, Server,
  ChevronDown, ChevronRight, Trash2, Edit, Users,
  MapPin, Calendar, CheckCircle, Clock, Send
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getShipments, getShipmentById, createShipment, updateShipment, deleteShipment,
  getClusters, getClusterById, createCluster, updateCluster, deleteCluster,
  addServerToCluster, addServersToCluster, removeServerFromCluster, updateClusterServer,
  getUnassignedServers,
  BeryllShipment, BeryllCluster, BeryllClusterServer,
  ShipmentStatus, ClusterStatus, ServerRole
} from "../../../api/beryll/beryllExtendedApi";
import { Modal } from "../../../components/Modal/Modal";
import { ConfirmModal } from "../../../components/Modal/ConfirmModal";

// Конфигурация статусов комплектов
const SHIPMENT_STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  FORMING: { label: "Формируется", color: "text-blue-600", bg: "bg-blue-100", icon: <Package size={14} /> },
  READY: { label: "Готов", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle size={14} /> },
  SHIPPED: { label: "Отгружен", color: "text-purple-600", bg: "bg-purple-100", icon: <Send size={14} /> },
  IN_TRANSIT: { label: "В пути", color: "text-orange-600", bg: "bg-orange-100", icon: <Truck size={14} /> },
  DELIVERED: { label: "Доставлен", color: "text-teal-600", bg: "bg-teal-100", icon: <MapPin size={14} /> },
  ACCEPTED: { label: "Принят", color: "text-gray-600", bg: "bg-gray-100", icon: <CheckCircle size={14} /> }
};

// Конфигурация статусов кластеров
const CLUSTER_STATUS_CONFIG: Record<ClusterStatus, { label: string; color: string; bg: string }> = {
  FORMING: { label: "Формируется", color: "text-blue-600", bg: "bg-blue-100" },
  READY: { label: "Готов", color: "text-green-600", bg: "bg-green-100" },
  SHIPPED: { label: "Отгружен", color: "text-purple-600", bg: "bg-purple-100" },
  DEPLOYED: { label: "Развёрнут", color: "text-gray-600", bg: "bg-gray-100" }
};

// Конфигурация ролей
const SERVER_ROLE_CONFIG: Record<ServerRole, { label: string; color: string; bg: string }> = {
  MASTER: { label: "Master", color: "text-red-600", bg: "bg-red-100" },
  WORKER: { label: "Worker", color: "text-blue-600", bg: "bg-blue-100" },
  STORAGE: { label: "Storage", color: "text-green-600", bg: "bg-green-100" },
  GATEWAY: { label: "Gateway", color: "text-purple-600", bg: "bg-purple-100" }
};

type ViewMode = "shipments" | "clusters";

const ClustersTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("shipments");
  const [shipments, setShipments] = useState<BeryllShipment[]>([]);
  const [clusters, setClusters] = useState<BeryllCluster[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<BeryllShipment | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<BeryllCluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Модальные окна
  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);
  const [showEditShipmentModal, setShowEditShipmentModal] = useState(false);
  const [showCreateClusterModal, setShowCreateClusterModal] = useState(false);
  const [showEditClusterModal, setShowEditClusterModal] = useState(false);
  const [showAddServersModal, setShowAddServersModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: "shipment" | "cluster"; id: number } | null>(null);
  
  // Загрузка данных
  const loadShipments = async () => {
    try {
      setLoading(true);
      const data = await getShipments({ search });
      setShipments(data);
    } catch (error: any) {
      toast.error("Ошибка загрузки комплектов");
    } finally {
      setLoading(false);
    }
  };
  
  const loadClusters = async () => {
    try {
      setLoading(true);
      const data = await getClusters({ search });
      setClusters(data);
    } catch (error: any) {
      toast.error("Ошибка загрузки кластеров");
    } finally {
      setLoading(false);
    }
  };
  
  const loadShipmentDetails = async (id: number) => {
    try {
      const data = await getShipmentById(id);
      setSelectedShipment(data);
    } catch (error) {
      toast.error("Ошибка загрузки комплекта");
    }
  };
  
  const loadClusterDetails = async (id: number) => {
    try {
      const data = await getClusterById(id);
      setSelectedCluster(data);
    } catch (error) {
      toast.error("Ошибка загрузки кластера");
    }
  };
  
  useEffect(() => {
    if (viewMode === "shipments") {
      loadShipments();
    } else {
      loadClusters();
    }
  }, [viewMode, search]);
  
  // Компонент карточки комплекта
  const ShipmentCard: React.FC<{ shipment: BeryllShipment }> = ({ shipment }) => {
    const statusConfig = SHIPMENT_STATUS_CONFIG[shipment.status];
    
    return (
      <div
        className={`
          p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all
          ${selectedShipment?.id === shipment.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}
        `}
        onClick={() => loadShipmentDetails(shipment.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">{shipment.name}</h3>
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>
        </div>
        
        {shipment.destinationCity && (
          <div className="text-sm text-gray-500 flex items-center gap-1 mb-2">
            <MapPin size={14} />
            {shipment.destinationCity}
          </div>
        )}
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Boxes size={12} />
            {shipment.clustersCount || 0} кластеров
          </span>
          <span className="flex items-center gap-1">
            <Server size={12} />
            {shipment.totalServers || 0} / {shipment.expectedCount} серверов
          </span>
        </div>
        
        {/* Прогресс-бар */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              shipment.completionPercent === 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${shipment.completionPercent || 0}%` }}
          />
        </div>
        <div className="text-xs text-right text-gray-500 mt-1">
          {shipment.completionPercent || 0}%
        </div>
      </div>
    );
  };
  
  // Компонент карточки кластера
  const ClusterCard: React.FC<{ cluster: BeryllCluster }> = ({ cluster }) => {
    const statusConfig = CLUSTER_STATUS_CONFIG[cluster.status];
    
    return (
      <div
        className={`
          p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all
          ${selectedCluster?.id === cluster.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}
        `}
        onClick={() => loadClusterDetails(cluster.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">{cluster.name}</h3>
          <span className={`text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        
        {cluster.shipment && (
          <div className="text-sm text-gray-500 flex items-center gap-1 mb-2">
            <Truck size={14} />
            {cluster.shipment.name}
          </div>
        )}
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Server size={12} />
            {cluster.serversCount || 0} / {cluster.expectedCount}
          </span>
          {cluster.masterCount !== undefined && (
            <span className="text-red-600">M: {cluster.masterCount}</span>
          )}
          {cluster.workerCount !== undefined && (
            <span className="text-blue-600">W: {cluster.workerCount}</span>
          )}
        </div>
        
        {/* Прогресс-бар */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              cluster.completionPercent === 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${cluster.completionPercent || 0}%` }}
          />
        </div>
      </div>
    );
  };
  
  // Детали комплекта
  const ShipmentDetails: React.FC<{ shipment: BeryllShipment }> = ({ shipment }) => {
    const statusConfig = SHIPMENT_STATUS_CONFIG[shipment.status];
    
    return (
      <div className="bg-white rounded-lg shadow">
        {/* Заголовок */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{shipment.name}</h3>
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            {shipment.destinationCity && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={14} />
                {shipment.destinationCity}
                {shipment.destinationAddress && ` — ${shipment.destinationAddress}`}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditShipmentModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Редактировать"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm({ type: "shipment", id: shipment.id })}
              className="p-2 hover:bg-red-100 text-red-500 rounded-lg"
              title="Удалить"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Информация */}
        <div className="p-4 bg-gray-50 border-b grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Серверов:</span>
            <span className="ml-2 font-medium">{shipment.totalServers} / {shipment.expectedCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Кластеров:</span>
            <span className="ml-2 font-medium">{shipment.clustersCount}</span>
          </div>
          {shipment.plannedShipDate && (
            <div>
              <span className="text-gray-500">План отгрузки:</span>
              <span className="ml-2 font-medium">{new Date(shipment.plannedShipDate).toLocaleDateString()}</span>
            </div>
          )}
          {shipment.waybillNumber && (
            <div>
              <span className="text-gray-500">ТТН:</span>
              <span className="ml-2 font-medium">{shipment.waybillNumber}</span>
            </div>
          )}
        </div>
        
        {/* Кластеры комплекта */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Кластеры</h4>
            <button
              onClick={() => {
                setShowCreateClusterModal(true);
              }}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus size={16} />
              Добавить кластер
            </button>
          </div>
          
          {shipment.clusters && shipment.clusters.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {shipment.clusters.map(cluster => (
                <div
                  key={cluster.id}
                  className="p-3 border rounded-lg hover:border-blue-400 cursor-pointer"
                  onClick={() => {
                    setViewMode("clusters");
                    loadClusterDetails(cluster.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cluster.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${CLUSTER_STATUS_CONFIG[cluster.status].bg} ${CLUSTER_STATUS_CONFIG[cluster.status].color}`}>
                      {CLUSTER_STATUS_CONFIG[cluster.status].label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {cluster.clusterServers?.length || 0} серверов
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">
              Кластеры не добавлены
            </div>
          )}
        </div>
        
        {/* Контакты */}
        {(shipment.contactPerson || shipment.contactPhone) && (
          <div className="px-4 pb-4">
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <strong>Контакт:</strong> {shipment.contactPerson} {shipment.contactPhone && `(${shipment.contactPhone})`}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Детали кластера
  const ClusterDetails: React.FC<{ cluster: BeryllCluster }> = ({ cluster }) => {
    const statusConfig = CLUSTER_STATUS_CONFIG[cluster.status];
    
    return (
      <div className="bg-white rounded-lg shadow">
        {/* Заголовок */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{cluster.name}</h3>
              <span className={`text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            {cluster.description && (
              <p className="text-sm text-gray-500 mt-1">{cluster.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddServersModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
              Добавить серверы
            </button>
            <button
              onClick={() => setShowEditClusterModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm({ type: "cluster", id: cluster.id })}
              className="p-2 hover:bg-red-100 text-red-500 rounded-lg"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Информация */}
        <div className="p-4 bg-gray-50 border-b grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Серверов:</span>
            <span className="ml-2 font-medium">{cluster.serversCount} / {cluster.expectedCount}</span>
          </div>
          {cluster.shipment && (
            <div>
              <span className="text-gray-500">Комплект:</span>
              <span className="ml-2 font-medium">{cluster.shipment.name}</span>
            </div>
          )}
          {cluster.configVersion && (
            <div>
              <span className="text-gray-500">Версия:</span>
              <span className="ml-2 font-medium">{cluster.configVersion}</span>
            </div>
          )}
        </div>
        
        {/* Серверы кластера */}
        <div className="p-4">
          <h4 className="font-medium mb-3">Серверы кластера</h4>
          
          {cluster.clusterServers && cluster.clusterServers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">S/N</th>
                    <th className="px-3 py-2 text-left">Роль</th>
                    <th className="px-3 py-2 text-left">Hostname</th>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-left">Статус</th>
                    <th className="px-3 py-2 text-center">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cluster.clusterServers.map((cs, index) => {
                    const roleConfig = SERVER_ROLE_CONFIG[cs.role];
                    return (
                      <tr key={cs.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{cs.orderNumber || index + 1}</td>
                        <td className="px-3 py-2 font-mono">
                          {cs.server?.apkSerialNumber || `#${cs.serverId}`}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${roleConfig.bg} ${roleConfig.color}`}>
                            {roleConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">{cs.clusterHostname || cs.server?.hostname || "—"}</td>
                        <td className="px-3 py-2">{cs.clusterIpAddress || "—"}</td>
                        <td className="px-3 py-2">{cs.server?.status || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={async () => {
                              if (confirm("Удалить сервер из кластера?")) {
                                try {
                                  await removeServerFromCluster(cluster.id, cs.serverId);
                                  toast.success("Сервер удалён из кластера");
                                  loadClusterDetails(cluster.id);
                                } catch (error: any) {
                                  toast.error(error.response?.data?.message || "Ошибка");
                                }
                              }
                            }}
                            className="p-1 hover:bg-red-100 text-red-500 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <Server size={32} className="mx-auto mb-2 text-gray-300" />
              <p>Серверы не добавлены</p>
              <button
                onClick={() => setShowAddServersModal(true)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Добавить серверы
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Boxes className="text-blue-600" />
            Кластеры и Комплекты
          </h2>
          
          {/* Переключатель режима */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setViewMode("shipments"); setSelectedCluster(null); }}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === "shipments" ? "bg-white shadow text-blue-600" : "text-gray-600"
              }`}
            >
              <Truck size={16} className="inline mr-1" />
              Комплекты
            </button>
            <button
              onClick={() => { setViewMode("clusters"); setSelectedShipment(null); }}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === "clusters" ? "bg-white shadow text-blue-600" : "text-gray-600"
              }`}
            >
              <Boxes size={16} className="inline mr-1" />
              Кластеры
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => viewMode === "shipments" ? setShowCreateShipmentModal(true) : setShowCreateClusterModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            {viewMode === "shipments" ? "Создать комплект" : "Создать кластер"}
          </button>
        </div>
      </div>
      
      <div className="flex gap-4">
        {/* Список */}
        <div className="w-96 flex-shrink-0 space-y-3 max-h-[700px] overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Загрузка...</div>
          ) : viewMode === "shipments" ? (
            shipments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Комплекты не найдены</div>
            ) : (
              shipments.map(shipment => (
                <ShipmentCard key={shipment.id} shipment={shipment} />
              ))
            )
          ) : (
            clusters.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Кластеры не найдены</div>
            ) : (
              clusters.map(cluster => (
                <ClusterCard key={cluster.id} cluster={cluster} />
              ))
            )
          )}
        </div>
        
        {/* Детали */}
        <div className="flex-1">
          {viewMode === "shipments" && selectedShipment ? (
            <ShipmentDetails shipment={selectedShipment} />
          ) : viewMode === "clusters" && selectedCluster ? (
            <ClusterDetails cluster={selectedCluster} />
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              {viewMode === "shipments" ? (
                <>
                  <Truck size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Выберите комплект для просмотра</p>
                </>
              ) : (
                <>
                  <Boxes size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Выберите кластер для просмотра</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Модальные окна */}
      <CreateShipmentModal
        isOpen={showCreateShipmentModal}
        onClose={() => setShowCreateShipmentModal(false)}
        onSuccess={() => {
          loadShipments();
          setShowCreateShipmentModal(false);
        }}
      />
      
      {selectedShipment && (
        <EditShipmentModal
          isOpen={showEditShipmentModal}
          shipment={selectedShipment}
          onClose={() => setShowEditShipmentModal(false)}
          onSuccess={() => {
            loadShipments();
            loadShipmentDetails(selectedShipment.id);
            setShowEditShipmentModal(false);
          }}
        />
      )}
      
      <CreateClusterModal
        isOpen={showCreateClusterModal}
        shipmentId={viewMode === "shipments" && selectedShipment ? selectedShipment.id : undefined}
        shipments={shipments}
        onClose={() => setShowCreateClusterModal(false)}
        onSuccess={() => {
          loadClusters();
          if (selectedShipment) loadShipmentDetails(selectedShipment.id);
          setShowCreateClusterModal(false);
        }}
      />
      
      {selectedCluster && (
        <>
          <EditClusterModal
            isOpen={showEditClusterModal}
            cluster={selectedCluster}
            shipments={shipments}
            onClose={() => setShowEditClusterModal(false)}
            onSuccess={() => {
              loadClusters();
              loadClusterDetails(selectedCluster.id);
              setShowEditClusterModal(false);
            }}
          />
          
          <AddServersModal
            isOpen={showAddServersModal}
            cluster={selectedCluster}
            onClose={() => setShowAddServersModal(false)}
            onSuccess={() => {
              loadClusterDetails(selectedCluster.id);
              setShowAddServersModal(false);
            }}
          />
        </>
      )}
      
      {/* Подтверждение удаления */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={true}
          title={showDeleteConfirm.type === "shipment" ? "Удалить комплект?" : "Удалить кластер?"}
          message="Это действие необратимо"
          onConfirm={async () => {
            try {
              if (showDeleteConfirm.type === "shipment") {
                await deleteShipment(showDeleteConfirm.id);
                toast.success("Комплект удалён");
                setSelectedShipment(null);
                loadShipments();
              } else {
                await deleteCluster(showDeleteConfirm.id);
                toast.success("Кластер удалён");
                setSelectedCluster(null);
                loadClusters();
              }
            } catch (error: any) {
              toast.error(error.response?.data?.message || "Ошибка удаления");
            }
            setShowDeleteConfirm(null);
          }}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

// Создание комплекта
const CreateShipmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "",
    destinationCity: "",
    destinationAddress: "",
    contactPerson: "",
    contactPhone: "",
    expectedCount: 80,
    plannedShipDate: "",
    waybillNumber: "",
    carrier: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Введите название");
      return;
    }
    
    try {
      setSaving(true);
      await createShipment(form);
      toast.success("Комплект создан");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать комплект">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Комплект #1 — Москва"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Город</label>
            <input
              type="text"
              value={form.destinationCity}
              onChange={(e) => setForm({ ...form, destinationCity: e.target.value })}
              placeholder="Москва"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Кол-во серверов</label>
            <input
              type="number"
              value={form.expectedCount}
              onChange={(e) => setForm({ ...form, expectedCount: parseInt(e.target.value) || 80 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Адрес доставки</label>
          <input
            type="text"
            value={form.destinationAddress}
            onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Контактное лицо</label>
            <input
              type="text"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Телефон</label>
            <input
              type="text"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Дата отгрузки (план)</label>
            <input
              type="date"
              value={form.plannedShipDate}
              onChange={(e) => setForm({ ...form, plannedShipDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Перевозчик</label>
            <input
              type="text"
              value={form.carrier}
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
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
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Создание..." : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Редактирование комплекта
const EditShipmentModal: React.FC<{
  isOpen: boolean;
  shipment: BeryllShipment;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, shipment, onClose, onSuccess }) => {
  const [form, setForm] = useState({ ...shipment });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setForm({ ...shipment });
  }, [shipment]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateShipment(shipment.id, form);
      toast.success("Комплект обновлён");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать комплект">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Статус</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ShipmentStatus })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {Object.entries(SHIPMENT_STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Город</label>
            <input
              type="text"
              value={form.destinationCity || ""}
              onChange={(e) => setForm({ ...form, destinationCity: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Кол-во серверов</label>
            <input
              type="number"
              value={form.expectedCount}
              onChange={(e) => setForm({ ...form, expectedCount: parseInt(e.target.value) || 80 })}
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

// Создание кластера
const CreateClusterModal: React.FC<{
  isOpen: boolean;
  shipmentId?: number;
  shipments: BeryllShipment[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, shipmentId, shipments, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    shipmentId: shipmentId || null as number | null,
    expectedCount: 10,
    configVersion: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (shipmentId) {
      setForm(f => ({ ...f, shipmentId }));
    }
  }, [shipmentId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Введите название");
      return;
    }
    
    try {
      setSaving(true);
      await createCluster(form);
      toast.success("Кластер создан");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать кластер">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="cl1, production-cluster..."
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Комплект</label>
          <select
            value={form.shipmentId || ""}
            onChange={(e) => setForm({ ...form, shipmentId: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">— Без комплекта —</option>
            {shipments.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Кол-во серверов</label>
            <input
              type="number"
              value={form.expectedCount}
              onChange={(e) => setForm({ ...form, expectedCount: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Версия конфига</label>
            <input
              type="text"
              value={form.configVersion}
              onChange={(e) => setForm({ ...form, configVersion: e.target.value })}
              placeholder="v1.0"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Описание</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg"
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
            {saving ? "Создание..." : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Редактирование кластера
const EditClusterModal: React.FC<{
  isOpen: boolean;
  cluster: BeryllCluster;
  shipments: BeryllShipment[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, cluster, shipments, onClose, onSuccess }) => {
  const [form, setForm] = useState({ ...cluster });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setForm({ ...cluster });
  }, [cluster]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateCluster(cluster.id, form);
      toast.success("Кластер обновлён");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать кластер">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Статус</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ClusterStatus })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {Object.entries(CLUSTER_STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Комплект</label>
          <select
            value={form.shipmentId || ""}
            onChange={(e) => setForm({ ...form, shipmentId: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">— Без комплекта —</option>
            {shipments.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
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

// Добавление серверов в кластер
const AddServersModal: React.FC<{
  isOpen: boolean;
  cluster: BeryllCluster;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, cluster, onClose, onSuccess }) => {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [role, setRole] = useState<ServerRole>("WORKER");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      loadServers();
    }
  }, [isOpen]);
  
  const loadServers = async () => {
    try {
      setLoading(true);
      const data = await getUnassignedServers({ status: "DONE", limit: 200 });
      setServers(data);
    } catch (error) {
      toast.error("Ошибка загрузки серверов");
    } finally {
      setLoading(false);
    }
  };
  
  const filteredServers = servers.filter(s =>
    !search ||
    s.apkSerialNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.hostname?.toLowerCase().includes(search.toLowerCase())
  );
  
  const toggleServer = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Выберите серверы");
      return;
    }
    
    try {
      setSaving(true);
      const result = await addServersToCluster(cluster.id, { serverIds: selectedIds, role });
      toast.success(`Добавлено ${result.added} серверов`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Добавить серверы в ${cluster.name}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Поиск серверов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ServerRole)}
            className="px-3 py-2 border rounded-lg"
          >
            {Object.entries(SERVER_ROLE_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
        
        <div className="border rounded-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Загрузка...</div>
          ) : filteredServers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Серверы не найдены</div>
          ) : (
            filteredServers.map(server => (
              <div
                key={server.id}
                className={`
                  p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50
                  ${selectedIds.includes(server.id) ? "bg-blue-50" : ""}
                `}
                onClick={() => toggleServer(server.id)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(server.id)}
                    onChange={() => {}}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">{server.apkSerialNumber || `#${server.id}`}</div>
                    <div className="text-xs text-gray-500">{server.hostname} • {server.ipAddress}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          Выбрано: {selectedIds.length}
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || selectedIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Добавление..." : `Добавить (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ClustersTab;
