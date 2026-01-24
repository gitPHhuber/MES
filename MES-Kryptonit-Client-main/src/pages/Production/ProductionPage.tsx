/**
 * ProductionPage.tsx - Главная страница учёта выработки v2
 * 
 * Вкладки: Ввод, Подтверждение, Журнал, Таблица, Справочники
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
    PlusCircle, CheckSquare, BookOpen, Table2, Settings,
    Factory
} from "lucide-react";

import ProductionEntry from "./tabs/ProductionEntry";
import ProductionApproval from "./tabs/ProductionApproval";
import ProductionJournal from "./tabs/ProductionJournal";
import ProductionMatrix from "./tabs/ProductionMatrix";
import ProductionSettings from "./tabs/ProductionSettings";

type TabId = 'entry' | 'approval' | 'journal' | 'matrix' | 'settings';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
    component: React.ComponentType;
}

const tabs: Tab[] = [
    { id: 'entry', label: 'Ввод', icon: PlusCircle, component: ProductionEntry },
    { id: 'approval', label: 'Подтверждение', icon: CheckSquare, component: ProductionApproval },
    { id: 'journal', label: 'Журнал', icon: BookOpen, component: ProductionJournal },
    { id: 'matrix', label: 'Таблица', icon: Table2, component: ProductionMatrix },
    { id: 'settings', label: 'Справочники', icon: Settings, component: ProductionSettings },
];

const ProductionPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab') as TabId | null;
    
    const [activeTab, setActiveTab] = useState<TabId>(
        tabFromUrl && tabs.some(t => t.id === tabFromUrl) ? tabFromUrl : 'entry'
    );

    // Синхронизация с URL
    useEffect(() => {
        if (tabFromUrl !== activeTab) {
            setSearchParams({ tab: activeTab });
        }
    }, [activeTab]);

    useEffect(() => {
        if (tabFromUrl && tabs.some(t => t.id === tabFromUrl) && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || ProductionEntry;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-[1600px] mx-auto">
                
                {/* Заголовок */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Factory size={22} className="text-white" />
                        </div>
                        Учёт выработки
                    </h1>
                    <p className="text-gray-500 mt-1 ml-13">
                        Внесение, подтверждение и анализ производственных операций
                    </p>
                </div>

                {/* Табы */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex overflow-x-auto">
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                                        isActive
                                            ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Контент */}
                <ActiveComponent />
            </div>
        </div>
    );
};

export default ProductionPage;
