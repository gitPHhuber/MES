import React, { useState, useMemo, useEffect } from "react";
import { 
    Printer, RefreshCw, RotateCw, ArrowRight, 
    Tv, Tag, Ruler, Trash2, FolderOpen, PenTool, LayoutTemplate, Bookmark,
    // Иконки для маркировки
    Wine, Umbrella, ArrowUp, Snowflake, Flame, Package, AlertTriangle
} from "lucide-react";
import { printSpecialLabel } from "src/api/warehouseApi";
import { 
    fetchLabelTemplates, 
    createLabelTemplate, 
    deleteLabelTemplate, 
    LabelTemplateModel, 
    LabelElement 
} from "src/api/labelTemplatesApi";
import { LabelConstructor } from "../components/LabelConstructor";
import { Modal } from "src/components/Modal/Modal";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";
import clsx from "clsx";

type TemplateType = "VIDEO_KIT" | "SIMPLE" | "CUSTOM";

// --- КОМПОНЕНТ ПРЕВЬЮ (КАРТОЧКА) ---
const LabelPreviewCard: React.FC<{ 
    data: any, 
    title: string,
    template: TemplateType,
    size: { w: number, h: number },
    customLayout?: LabelElement[],
    currentIndex?: number,
    totalCount?: number
}> = ({ data, title, template, size, customLayout, currentIndex = 1, totalCount = 1 }) => {
    
    const infoString = `${data.productName} - ${data.quantity} ${data.unit} (ID: ${data.code})`;

    // Базовая ширина для отображения на экране (px)
    const baseWidthPx = 300;
    const cssHeight = size.w > 0 ? (baseWidthPx * (size.h / size.w)) : 190;

    // Функция подстановки переменных для кастомного макета
    const replaceVars = (text: string) => {
        if (!text) return '';
        return text
            // Основные переменные
            .replace(/\{\{code\}\}/g, data.code || '')
            .replace(/\{\{name\}\}/g, data.productName || '')
            .replace(/\{\{productName\}\}/g, data.productName || '')
            .replace(/\{\{id\}\}/g, data.id || '')
            .replace(/\{\{date\}\}/g, data.date || '')
            .replace(/\{\{serial\}\}/g, data.code || '')
            .replace(/\{\{contract\}\}/g, data.contract || '')
            .replace(/\{\{batch\}\}/g, data.batch || '')
            .replace(/\{\{qty\}\}/g, String(data.quantity || ''))
            .replace(/\{\{quantity\}\}/g, String(data.quantity || ''))
            .replace(/\{\{unit\}\}/g, data.unit || '')
            .replace(/\{\{price\}\}/g, data.price || '')
            .replace(/\{\{weight\}\}/g, data.weight || '')
            // URL для QR
            .replace(/\{\{url\}\}/g, `https://mes.local/item/${data.code}`)
            // Полная инфо-строка
            .replace(/\{\{full_info\}\}/g, infoString)
            .replace(/\{\{quantity_unit\}\}/g, `${data.quantity} ${data.unit}`)
            // СЧЁТЧИК (для нумерации этикеток)
            .replace(/\{\{current\}\}/g, String(currentIndex))
            .replace(/\{\{total\}\}/g, String(totalCount));
    };

    return (
        <div className="flex flex-col items-center animate-fade-in">
            <div className="text-xs font-bold text-gray-400 uppercase mb-2 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">
                {title}
            </div>
            
            <div className="bg-white shadow-2xl transition-all duration-300">
                <div 
                    className="bg-white relative flex flex-col box-border overflow-hidden" 
                    style={{ 
                        width: `${baseWidthPx}px`, 
                        height: `${cssHeight}px`,
                        border: '1px solid #000'
                    }}
                >
                    {/* 1. СТАНДАРТНЫЙ ШАБЛОН: ВИДЕОПЕРЕДАТЧИКИ */}
                    {template === "VIDEO_KIT" && (
                        <div className="flex flex-row h-full p-2">
                            <div className="w-6 border-r border-black flex items-end justify-center py-2 bg-gray-50">
                                <div className="text-[8px] whitespace-nowrap -rotate-90 origin-bottom-left translate-x-full mb-4 w-40 truncate font-mono">
                                    {data.contract}
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col pl-2">
                                <div className="flex justify-between items-start mb-2 shrink-0">
                                    <div className="font-mono text-sm font-bold truncate mt-1">{data.code}</div>
                                    <div><QRCode value={data.code} size={35} /></div>
                                </div>
                                <div className="border-2 border-black text-center text-xs w-full mb-2">
                                    <div className="border-b border-black p-1 font-bold bg-gray-50">{data.productName}</div>
                                    <div className="flex border-b border-black h-10">
                                        <div className="border-r border-black w-1/3 font-bold flex items-center justify-center text-lg">{data.id}</div>
                                        <div className="w-2/3 flex flex-col">
                                            <div className="border-b border-black h-1/2 flex items-center justify-center text-[9px]">{data.date}</div>
                                            <div className="h-1/2 font-bold flex items-center justify-center text-sm">{data.quantity} {data.unit}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto flex justify-center pb-2">
                                    <QRCode value={infoString} size={60} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. СТАНДАРТНЫЙ ШАБЛОН: ПРОСТОЙ */}
                    {template === "SIMPLE" && (
                        <div className="h-full flex flex-col justify-center items-center p-2">
                            <div className="text-sm font-bold text-center mb-2 leading-tight">{data.productName}</div>
                            <div className="flex items-center gap-4 w-full justify-center">
                                <QRCode value={infoString} size={70} />
                                <div className="text-left overflow-hidden">
                                    <div className="text-[9px] text-gray-500 uppercase">ID / Партия</div>
                                    <div className="font-mono font-bold text-sm mb-1 truncate">{data.code}</div>
                                    <div className="font-black text-xl">{data.quantity} {data.unit}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. КАСТОМНЫЙ ШАБЛОН (ИЗ КОНСТРУКТОРА) */}
                    {template === "CUSTOM" && customLayout && customLayout.map(el => {
                        // Определяем стиль позиционирования
                        const elStyle: React.CSSProperties = {
                            position: 'absolute',
                            left: `${(el.x / size.w) * 100}%`,
                            top: `${(el.y / size.h) * 100}%`,
                            width: `${(el.width / size.w) * 100}%`,
                            height: ['QR', 'ICON', 'IMAGE', 'RECTANGLE'].includes(el.type) 
                                ? `${(el.height / size.h) * 100}%` 
                                : 'auto',
                            fontSize: `${(el.fontSize || 10) * (baseWidthPx / size.w) * 0.35}px`,
                            fontWeight: el.isBold ? 'bold' : 'normal',
                            textAlign: el.align || 'left',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                            overflow: 'hidden',
                        };

                        return (
                            <div key={el.id} style={elStyle}>
                                
                                {/* TEXT - обычный текст */}
                                {el.type === 'TEXT' && (
                                    <span className="whitespace-pre-wrap break-words leading-tight">
                                        {replaceVars(el.content || '')}
                                    </span>
                                )}
                                
                                {/* QR - QR-код */}
                                {el.type === 'QR' && (
                                    <QRCode 
                                        value={replaceVars(el.content || '{{code}}')} 
                                        style={{ width: '100%', height: '100%' }} 
                                        viewBox="0 0 256 256"
                                    />
                                )}
                                
                                {/* COUNTER - счётчик/нумерация */}
                                {el.type === 'COUNTER' && (
                                    <span 
                                        className="whitespace-nowrap font-mono"
                                        style={{ fontWeight: el.isBold ? 'bold' : 'normal' }}
                                    >
                                        {replaceVars(el.counterFormat || '{{current}} / {{total}}')}
                                    </span>
                                )}
                                
                                {/* IMAGE - загруженная картинка */}
                                {el.type === 'IMAGE' && el.imageUrl && (
                                    <img 
                                        src={el.imageUrl} 
                                        alt={el.imageName || 'Image'} 
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                
                                {/* ICON - иконка маркировки */}
                                {el.type === 'ICON' && (
                                    <div className="w-full h-full flex items-center justify-center p-0.5">
                                        {/* Пользовательская иконка (с imageUrl) */}
                                        {el.imageUrl ? (
                                            <img src={el.imageUrl} alt={el.content || 'Icon'} className="w-full h-full object-contain" />
                                        ) : (
                                            /* Стандартные иконки */
                                            <>
                                                {el.iconType === 'fragile' && <Wine className="w-full h-full text-gray-800" strokeWidth={1.5} />}
                                                {el.iconType === 'keep_dry' && <Umbrella className="w-full h-full text-gray-800" strokeWidth={1.5} />}
                                                {el.iconType === 'this_side_up' && <ArrowUp className="w-full h-full text-gray-800" strokeWidth={1.5} />}
                                                {el.iconType === 'keep_frozen' && <Snowflake className="w-full h-full text-gray-800" strokeWidth={1.5} />}
                                                {el.iconType === 'keep_away_heat' && <Flame className="w-full h-full text-gray-800" strokeWidth={1.5} />}
                                                {el.iconType === 'do_not_stack' && <Package className="w-full h-full text-gray-800" strokeWidth={1.5} />}
                                                {el.iconType === 'warning' && <AlertTriangle className="w-full h-full text-gray-800" strokeWidth={1.5} />}
                                            </>
                                        )}
                                    </div>
                                )}
                                
                                {/* LINE - линия */}
                                {el.type === 'LINE' && (
                                    <div 
                                        className="bg-black"
                                        style={{
                                            width: el.width >= el.height ? '100%' : `${(el.strokeWidth || 0.3) * 3}px`,
                                            height: el.width >= el.height ? `${(el.strokeWidth || 0.3) * 3}px` : '100%',
                                        }}
                                    />
                                )}
                                
                                {/* RECTANGLE - рамка */}
                                {el.type === 'RECTANGLE' && (
                                    <div 
                                        className="w-full h-full border-black"
                                        style={{ borderWidth: `${(el.strokeWidth || 0.3) * 2}px` }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="mt-2 text-[10px] text-gray-400 font-mono">
                {size.w} x {size.h} мм
            </div>
        </div>
    );
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---
export const VideoTransmittersLabel: React.FC = () => {
    const [templateType, setTemplateType] = useState<TemplateType>("VIDEO_KIT");
    
    // Данные формы
    const [form, setForm] = useState({
        code: "7342511000501", 
        productName: "Приемник 2xLR1121",
        id: "734",
        date: new Date().toLocaleString('ru-RU'),
        quantity: "500", 
        unit: "шт.",
        contract: "Г.к. № 249/2/ОП/25/1/37 от «05» сентября 2025 г."
    });

    const [printCount, setPrintCount] = useState<number>(1);
    const [labelSize, setLabelSize] = useState({ width: 140, height: 90 }); 
    const [loading, setLoading] = useState(false);

    // Конструктор
    const [isConstructorMode, setIsConstructorMode] = useState(false);
    const [customLayout, setCustomLayout] = useState<LabelElement[]>([]);
    const [customTemplateName, setCustomTemplateName] = useState("");
    
    // Список шаблонов из БД
    const [savedTemplates, setSavedTemplates] = useState<LabelTemplateModel[]>([]);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await fetchLabelTemplates();
            setSavedTemplates(data);
        } catch (e) {
            console.error(e);
        }
    };

    // --- ЛОГИКА ---

    const endCode = useMemo(() => {
        try {
            const cleanCode = form.code.replace(/\D/g, ''); 
            if(!cleanCode) return form.code;
            const startBig = BigInt(cleanCode);
            const countBig = BigInt(Math.max(1, printCount));
            const endBig = startBig + countBig - 1n;
            return endBig.toString().padStart(cleanCode.length, '0');
        } catch {
            return form.code;
        }
    }, [form.code, printCount]);

    const handlePrint = async () => {
        if (printCount < 1) return toast.error("Количество копий должно быть > 0");
        setLoading(true);
        try {
            await printSpecialLabel({
                ...form,
                template: templateType,
                // Если выбран кастомный, передаем массив элементов для рендера на бэке
                customLayout: templateType === "CUSTOM" ? customLayout : undefined,
                printCount,
                rotate: false,
                widthMm: labelSize.width,
                heightMm: labelSize.height
            });
            toast.success(`Отправлено ${printCount} этикеток`);
        } catch (e: any) {
            toast.error("Ошибка печати: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Сохранение из конструктора (в БД)
    const onSaveConstructor = async (name: string, w: number, h: number, layout: LabelElement[]) => {
        try {
            await createLabelTemplate(name, w, h, layout);
            toast.success("Шаблон сохранен в базу!");
            setIsConstructorMode(false);
            loadTemplates(); // Обновляем список
            
            // Авто-выбор созданного
            setTemplateType("CUSTOM");
            setCustomLayout(layout);
            setCustomTemplateName(name);
            setLabelSize({ width: w, height: h });
        } catch (e) {
            toast.error("Ошибка сохранения");
        }
    };

    // Применение шаблона из списка
    const applySavedTemplate = (t: LabelTemplateModel) => {
        setIsConstructorMode(false);
        setTemplateType("CUSTOM");
        setLabelSize({ width: t.width, height: t.height });
        setCustomLayout(t.layout);
        setCustomTemplateName(t.name);
        toast.success(`Загружен макет: ${t.name}`);
    };

    const deleteSavedTemplate = async (id: number) => {
        if(!confirm("Удалить шаблон?")) return;
        await deleteLabelTemplate(id);
        loadTemplates();
        if(customTemplateName && templateType === 'CUSTOM') {
             setTemplateType("VIDEO_KIT"); // сброс если удалили текущий
             setCustomTemplateName("");
        }
    };

    const updateTime = () => {
        setForm(prev => ({...prev, date: new Date().toLocaleString('ru-RU')}));
    };

    const toggleRotation = () => {
        setLabelSize({ width: labelSize.height, height: labelSize.width });
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-10">
            
            {/* ТУЛБАР ВЫБОРА РЕЖИМА */}
            <div className="mb-6 flex flex-col md:flex-row justify-center items-center gap-4">
                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm inline-flex gap-1">
                    <button onClick={() => {setTemplateType("VIDEO_KIT"); setIsConstructorMode(false); setLabelSize({width: 140, height: 90})}} className={clsx("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", templateType === "VIDEO_KIT" && !isConstructorMode ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100")}>
                        <Tv size={18}/> Стандартный
                    </button>
                    <button onClick={() => {setTemplateType("SIMPLE"); setIsConstructorMode(false); setLabelSize({width: 100, height: 60})}} className={clsx("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", templateType === "SIMPLE" && !isConstructorMode ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100")}>
                        <Tag size={18}/> Простой
                    </button>
                    {/* Кнопка "Мои шаблоны" активна, если выбран кастомный тип */}
                    <button onClick={() => {setTemplateType("CUSTOM"); setIsConstructorMode(false)}} className={clsx("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", templateType === "CUSTOM" && !isConstructorMode ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100")}>
                        <LayoutTemplate size={18}/> {customTemplateName || "Мои шаблоны"}
                    </button>
                </div>

                <button 
                    onClick={() => setIsConstructorMode(!isConstructorMode)}
                    className={clsx("px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border", isConstructorMode ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50")}
                >
                    {isConstructorMode ? <Trash2 size={18}/> : <PenTool size={18}/>}
                    {isConstructorMode ? "Закрыть редактор" : "Конструктор"}
                </button>
            </div>

            {/* РЕЖИМ КОНСТРУКТОРА */}
            {isConstructorMode ? (
                <LabelConstructor 
                    initialWidth={labelSize.width}
                    initialHeight={labelSize.height}
                    initialLayout={templateType === 'CUSTOM' ? customLayout : []}
                    onSave={onSaveConstructor}
                    onClose={() => setIsConstructorMode(false)}
                />
            ) : (
                <div className="flex flex-col xl:flex-row gap-8">
                    
                    {/* ЛЕВАЯ КОЛОНКА: НАСТРОЙКИ */}
                    <div className="flex-1 space-y-5 bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                        <div className="flex items-center gap-2 text-indigo-800 border-b pb-4 mb-2">
                            <Printer className="text-indigo-600"/>
                            <h2 className="text-xl font-bold">Параметры печати</h2>
                        </div>

                        {/* СПИСОК ШАБЛОНОВ ИЗ БД */}
                        {savedTemplates.length > 0 && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                                    <FolderOpen size={12}/> Выберите шаблон:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {savedTemplates.map(t => (
                                        <div key={t.id} className={clsx("group flex items-center bg-white border rounded-lg overflow-hidden shadow-sm transition cursor-pointer", customTemplateName === t.name ? "border-indigo-500 ring-1 ring-indigo-500" : "border-gray-300 hover:border-indigo-400")}>
                                            <div onClick={() => applySavedTemplate(t)} className="px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-indigo-600">
                                                {t.name} <span className="text-gray-400 font-normal ml-1">{t.width}x{t.height}</span>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); deleteSavedTemplate(t.id); }} className="px-2 py-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 border-l">
                                                <Trash2 size={12}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ФОРМА ДАННЫХ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Наименование</label>
                                <input value={form.productName} onChange={e => setForm({...form, productName: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg font-bold text-gray-800 focus:border-indigo-500 outline-none" />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">ID / Номер</label>
                                <input value={form.id} onChange={e => setForm({...form, id: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Дата</label>
                                <div className="flex gap-1">
                                    <input value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none" />
                                    <button onClick={updateTime} className="p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200"><RefreshCw size={16}/></button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Кол-во</label>
                                <input value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Ед. изм.</label>
                                <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:border-indigo-500 outline-none" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Договор / Инфо</label>
                                <input value={form.contract} onChange={e => setForm({...form, contract: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none" />
                            </div>
                        </div>

                        {/* НАСТРОЙКИ ТИРАЖА */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-indigo-800 uppercase flex justify-between">
                                    <span>Стартовый номер (Для QR)</span>
                                </label>
                                <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full p-3 border-2 border-indigo-200 rounded-xl font-mono text-xl font-black text-indigo-900 focus:border-indigo-500 outline-none shadow-sm" />
                            </div>
                            
                            <div className="flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-indigo-800 uppercase mb-1 block">Тираж</label>
                                    <input type="number" min="1" max="1000" value={printCount} onChange={e => setPrintCount(Number(e.target.value))} className="w-full p-3 border-2 border-indigo-200 rounded-xl font-bold text-lg" />
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-white/60 rounded-xl border border-indigo-100">
                                    <Ruler size={18} className="text-indigo-400"/>
                                    <div className="text-xs font-bold text-indigo-900">{labelSize.width} x {labelSize.height} мм</div>
                                </div>
                            </div>
                            
                            <div className="text-xs text-indigo-700 flex items-center justify-between">
                                <span>Диапазон:</span>
                                <div className="font-mono font-bold">{form.code} <ArrowRight size={12} className="inline"/> {endCode}</div>
                            </div>
                            
                            <button onClick={handlePrint} disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-indigo-300 transition flex justify-center items-center gap-3">
                                {loading ? "Генерация..." : <><Printer /> ПЕЧАТЬ</>}
                            </button>
                        </div>
                    </div>

                    {/* ПРАВАЯ ЧАСТЬ: ПРЕДПРОСМОТР */}
                    <div className="flex-1 bg-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 min-h-[500px] sticky top-6">
                        <div className="grid grid-cols-1 gap-12 w-full place-items-center max-h-[800px] overflow-y-auto custom-scrollbar">
                            <LabelPreviewCard 
                                title="Первая в серии" 
                                data={form} 
                                template={templateType} 
                                size={{ w: labelSize.width, h: labelSize.height }}
                                customLayout={templateType === 'CUSTOM' ? customLayout : undefined}
                                currentIndex={1}
                                totalCount={printCount}
                            />
                            {printCount > 1 && (
                                <>
                                    <div className="text-gray-400 -my-6"><ArrowRight className="rotate-90" size={32}/></div>
                                    <LabelPreviewCard 
                                        title={`Последняя (№${printCount})`} 
                                        data={{...form, code: endCode}} 
                                        template={templateType} 
                                        size={{ w: labelSize.width, h: labelSize.height }}
                                        customLayout={templateType === 'CUSTOM' ? customLayout : undefined}
                                        currentIndex={printCount}
                                        totalCount={printCount}
                                    />
                                </>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-6 font-mono text-center">
                            * Визуализация может незначительно отличаться от PDF.<br/>
                            Размер бумаги: {labelSize.width}x{labelSize.height} мм
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
