import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Package, ArrowRightLeft, FileText, Truck, PieChart, 
  BarChart3, ClipboardCheck, Settings, Tag, Tv, History 
} from "lucide-react";

import { fetchStructure } from "src/api/structureApi";
import { fetchProductsReference, fetchComponentsRef } from "src/api/product_componentApi";
import { fetchAlerts } from "src/api/warehouseApi";
import { SectionModel } from "src/store/StructureStore";
import { productModel } from "src/types/ProductModel";
import { componentModel } from "src/types/ComponentModel";
import { WAREHOUSE_ANALYTICS_ROUTE, WAREHOUSE_INVENTORY_ROUTE } from "src/utils/consts";

import { ProjectDashboard } from "./components/ProjectDashboard";
import { WarehouseIntake } from "./tabs/WarehouseIntake";
import { WarehouseMoves } from "./tabs/WarehouseMoves";
import { WarehouseDocs } from "./tabs/WarehouseDocs";
import { WarehouseBalance } from "./tabs/WarehouseBalance";
import { WarehouseSettings } from "./tabs/WarehouseSettings"; 
import { WarehouseLabels } from "./tabs/WarehouseLabels";
import { VideoTransmittersLabel } from "./tabs/VideoTransmittersLabel";
import { WarehousePrintHistory } from "./tabs/WarehousePrintHistory"; // Импорт компонента истории

type Tab = "INTAKE" | "MOVES" | "BALANCE" | "DOCS" | "SETTINGS" | "LABELS" | "VIDEO_LABEL" | "HISTORY";

export const WarehousePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("INTAKE");
  const [alertsCount, setAlertsCount] = useState(0); 
  
  const [sections, setSections] = useState<SectionModel[]>([]);
  const [productsList, setProductsList] = useState<productModel[]>([]);
  const [componentsList, setComponentsList] = useState<componentModel[]>([]);

  useEffect(() => {
    fetchStructure().then(setSections);
    fetchProductsReference().then(res => setProductsList(Array.isArray(res) ? res : [])); 
    fetchComponentsRef().then(res => setComponentsList(res.data || [])); 
    
    fetchAlerts().then(alerts => setAlertsCount(alerts.length)).catch(console.error);
  }, []); 

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-20 font-sans text-gray-700">
      
      {/* Шапка и Дашборд */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-100 rounded-2xl relative">
                  <Package className="w-8 h-8 text-indigo-600" />
                  {/* Красная точка на главной иконке, если есть дефицит */}
                  {alertsCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
               </div>
               <div>
                  <h1 className="text-3xl font-bold text-gray-800">Складская система</h1>
                  <p className="text-indigo-600/80 font-medium">WMS Kryptonit v2.4</p>
               </div>
            </div>

            {/* Правая часть: Дашборд + Кнопки спец. режимов */}
            <div className="flex flex-col md:flex-row gap-4 items-center w-full xl:w-auto">
                <ProjectDashboard />
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => navigate(WAREHOUSE_ANALYTICS_ROUTE)}
                        className="flex flex-col items-center justify-center w-24 h-20 bg-white border border-indigo-100 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition group"
                    >
                        <div className="p-2 bg-indigo-50 rounded-full group-hover:bg-indigo-100 text-indigo-600 mb-1"><BarChart3 size={20}/></div>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Аналитика</span>
                    </button>

                    <button 
                        onClick={() => navigate(WAREHOUSE_INVENTORY_ROUTE)}
                        className="flex flex-col items-center justify-center w-24 h-20 bg-white border border-orange-100 rounded-xl shadow-sm hover:shadow-md hover:border-orange-300 transition group"
                    >
                        <div className="p-2 bg-orange-50 rounded-full group-hover:bg-orange-100 text-orange-600 mb-1"><ClipboardCheck size={20}/></div>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Ревизия</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Навигация по вкладкам */}
        <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
           {[
               { id: "INTAKE", label: "Приёмка", icon: <Truck size={18}/> },
               { id: "MOVES", label: "Операции", icon: <ArrowRightLeft size={18}/> },
               { id: "BALANCE", label: "Остатки", icon: <PieChart size={18}/> },
               { id: "DOCS", label: "Накладные", icon: <FileText size={18}/> },
               { id: "LABELS", label: "Этикетки / Реестр", icon: <Tag size={18}/> },
               { id: "VIDEO_LABEL", label: "Печать Видео", icon: <Tv size={18}/> },
               // --- ВКЛАДКА ИСТОРИИ ---
               { id: "HISTORY", label: "История печати", icon: <History size={18}/> },
               // -----------------------
               { id: "SETTINGS", label: "Настройки / Лимиты", icon: 
                 <div className="relative flex items-center gap-1">
                    <Settings size={18}/>
                    {alertsCount > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">{alertsCount}</span>}
                 </div> 
               },
           ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-t-lg font-bold text-sm transition-all relative top-[1px] whitespace-nowrap ${
                      activeTab === tab.id 
                      ? "bg-white text-indigo-700 border border-gray-200 border-b-white shadow-sm z-10" 
                      : "text-gray-500 hover:text-indigo-600 hover:bg-gray-100/50"
                  }`}
               >
                   {tab.icon} {tab.label}
               </button>
           ))}
        </div>
      </div>

      {/* Контент вкладок */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "INTAKE" && <WarehouseIntake sections={sections} productsList={productsList} componentsList={componentsList} />}
        {activeTab === "MOVES" && <WarehouseMoves sections={sections} />}
        {activeTab === "BALANCE" && <WarehouseBalance />}
        {activeTab === "DOCS" && <WarehouseDocs />}
        {activeTab === "LABELS" && <WarehouseLabels />}
        {activeTab === "VIDEO_LABEL" && <VideoTransmittersLabel />}
        {activeTab === "HISTORY" && <WarehousePrintHistory />}
        {activeTab === "SETTINGS" && <WarehouseSettings />}
      </div>
    </div>
  );
};