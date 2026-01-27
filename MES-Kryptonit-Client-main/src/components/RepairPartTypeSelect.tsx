/**
 * RepairPartTypeSelect - выбор типа детали ремонта с возможностью добавления
 */

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, X, Check, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { getPartTypes, quickAddPartType, RepairPartType } from "../../api/repairPartTypeApi";

interface Props {
  value: string;
  onChange: (value: string, type?: RepairPartType) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

const RepairPartTypeSelect: React.FC<Props> = ({
  value,
  onChange,
  placeholder = "Выберите тип детали",
  disabled = false,
  className = "",
  error
}) => {
  const [types, setTypes] = useState<RepairPartType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [adding, setAdding] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const data = await getPartTypes();
      setTypes(data);
    } catch (err) {
      console.error("Ошибка загрузки типов:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!newTypeLabel.trim()) return;
    
    try {
      setAdding(true);
      const result = await quickAddPartType(newTypeLabel.trim());
      
      if (result.created) {
        toast.success(`Тип "${result.type.label}" создан`);
      }
      
      setTypes(prev => [...prev, result.type]);
      onChange(result.type.value, result.type);
      setShowAddModal(false);
      setNewTypeLabel("");
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Ошибка");
    } finally {
      setAdding(false);
    }
  };

  const handleSelect = (type: RepairPartType) => {
    onChange(type.value, type);
    setIsOpen(false);
    setSearch("");
  };

  const filtered = types.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.value.toLowerCase().includes(search.toLowerCase())
  );

  const selected = types.find(t => t.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Кнопка */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border rounded-lg text-sm
          flex items-center justify-between gap-2 transition-all
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-gray-400"}
          ${error ? "border-red-300" : "border-gray-300"}
          ${isOpen ? "ring-2 ring-blue-200 border-blue-400" : ""}
        `}
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {loading ? "Загрузка..." : selected?.label || placeholder}
        </span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
          {/* Поиск */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Список */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleSelect(type)}
                  className={`
                    w-full px-3 py-2 text-left text-sm flex items-center justify-between
                    hover:bg-gray-50 ${type.value === value ? "bg-blue-50" : ""}
                  `}
                >
                  <span className={type.value === value ? "text-blue-700 font-medium" : ""}>
                    {type.label}
                  </span>
                  {type.value === value && <Check size={16} className="text-blue-600" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                {search ? `"${search}" не найден` : "Нет типов"}
              </div>
            )}
          </div>

          {/* Кнопка добавления */}
          <div className="p-2 border-t">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                setNewTypeLabel(search);
              }}
              className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Добавить новый тип
            </button>
          </div>
        </div>
      )}

      {/* Модалка добавления */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Добавить тип детали</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Название *</label>
              <input
                type="text"
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
                placeholder="Например: Контроллер питания"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddType()}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleAddType}
                disabled={adding || !newTypeLabel.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairPartTypeSelect;