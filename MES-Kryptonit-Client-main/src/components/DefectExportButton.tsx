/**
 * DefectExportButton.tsx
 * 
 * Компонент кнопки экспорта дефектов с выпадающим меню
 * Поддерживает:
 * - Экспорт всех дефектов
 * - Экспорт с текущими фильтрами
 * - Экспорт статистики
 * 
 * Положить в: MES-Kryptonit-Client-main/src/pages/Beryll/components/DefectExportButton.tsx
 */

import React, { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileSpreadsheet, BarChart3, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { 
    downloadDefectsExcel, 
    downloadDefectStatsExcel,
    DefectExportParams 
} from "../../../api/beryll/defectExportApi";

interface Props {
    /** Текущие параметры фильтрации для экспорта с фильтрами */
    currentFilters?: DefectExportParams;
    /** Дополнительные классы */
    className?: string;
}

const DefectExportButton: React.FC<Props> = ({ currentFilters, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Закрытие при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleExportAll = async () => {
        setLoading("all");
        try {
            await downloadDefectsExcel({});
            toast.success("Файл успешно сформирован");
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error(error.response?.data?.message || "Ошибка экспорта");
        } finally {
            setLoading(null);
            setIsOpen(false);
        }
    };
    
    const handleExportFiltered = async () => {
        if (!currentFilters) {
            toast.error("Фильтры не применены");
            return;
        }
        
        setLoading("filtered");
        try {
            await downloadDefectsExcel(currentFilters);
            toast.success("Файл успешно сформирован");
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error(error.response?.data?.message || "Ошибка экспорта");
        } finally {
            setLoading(null);
            setIsOpen(false);
        }
    };
    
    const handleExportStats = async () => {
        setLoading("stats");
        try {
            await downloadDefectStatsExcel();
            toast.success("Статистика успешно сформирована");
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error(error.response?.data?.message || "Ошибка экспорта");
        } finally {
            setLoading(null);
            setIsOpen(false);
        }
    };
    
    const hasFilters = currentFilters && (
        currentFilters.status ||
        currentFilters.dateFrom ||
        currentFilters.dateTo ||
        currentFilters.serverId ||
        currentFilters.search
    );
    
    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Основная кнопка */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={!!loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg 
                           hover:bg-green-700 transition-colors disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                <span>Экспорт в Excel</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            
            {/* Выпадающее меню */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg 
                                border border-gray-200 py-1 z-50">
                    {/* Экспорт всех */}
                    <button
                        onClick={handleExportAll}
                        disabled={!!loading}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 
                                   text-left transition-colors disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        <div>
                            <div className="font-medium text-gray-900">Все записи</div>
                            <div className="text-xs text-gray-500">Экспорт всех дефектов</div>
                        </div>
                        {loading === "all" && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                    </button>
                    
                    {/* Экспорт с фильтрами */}
                    <button
                        onClick={handleExportFiltered}
                        disabled={!!loading || !hasFilters}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left 
                                    transition-colors disabled:opacity-50
                                    ${hasFilters ? "hover:bg-gray-50" : "cursor-not-allowed"}`}
                    >
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <div>
                            <div className="font-medium text-gray-900">С фильтрами</div>
                            <div className="text-xs text-gray-500">
                                {hasFilters 
                                    ? "Только отфильтрованные записи" 
                                    : "Сначала примените фильтры"}
                            </div>
                        </div>
                        {loading === "filtered" && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                    </button>
                    
                    <div className="border-t border-gray-200 my-1" />
                    
                    {/* Экспорт статистики */}
                    <button
                        onClick={handleExportStats}
                        disabled={!!loading}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 
                                   text-left transition-colors disabled:opacity-50"
                    >
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        <div>
                            <div className="font-medium text-gray-900">Статистика</div>
                            <div className="text-xs text-gray-500">Сводка по статусам и типам</div>
                        </div>
                        {loading === "stats" && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DefectExportButton;