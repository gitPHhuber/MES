import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Type,
  QrCode,
  Trash2,
  Save,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Square,
  Columns,
  GripHorizontal,
  ZoomIn,
  ZoomOut,
  Database,
  MousePointer2,
  Image as ImageIcon,
  Hash,
  Info,
  Umbrella,
  Wine,
  Package,
  ArrowUp,
  Snowflake,
  Flame,
  AlertTriangle,
  Upload,
  Library,
  Eye,
  Layers,
  HelpCircle,
  BookOpen,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import QRCode from "react-qr-code";
import clsx from "clsx";
import toast from "react-hot-toast";

// ===== ТИПЫ ДАННЫХ =====
export type LabelElementType = "TEXT" | "QR" | "RECTANGLE" | "LINE" | "IMAGE" | "COUNTER" | "ICON";

export interface LabelElement {
  id: string;
  type: LabelElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  isBold?: boolean;
  align?: "left" | "center" | "right";
  strokeWidth?: number;
  imageUrl?: string;
  imageName?: string;
  qrDescription?: string;
  qrSource?: "code" | "name" | "custom" | "serial" | "contract" | "url";
  counterFormat?: string;
  iconType?: string;
}

interface Props {
  initialName?: string;
  initialWidth?: number;
  initialHeight?: number;
  initialLayout?: LabelElement[];
  onSave?: (name: string, w: number, h: number, layout: LabelElement[]) => void;
  onClose?: () => void;
}

// ===== КОНФИГУРАЦИЯ =====
const PX_PER_MM = 3.78;
const SNAP_MM = 1.0;
const MIN_MM = 2;

// Переменные для текстовых полей
const TEXT_VARIABLES = [
  { label: "Переменная...", value: "", description: "" },
  { label: "Код товара {{code}}", value: "{{code}}", description: "Уникальный код/артикул" },
  { label: "Название {{name}}", value: "{{name}}", description: "Наименование товара" },
  { label: "Серийный номер {{serial}}", value: "{{serial}}", description: "Серийный номер изделия" },
  { label: "Цена {{price}}", value: "{{price}}", description: "Стоимость" },
  { label: "Дата {{date}}", value: "{{date}}", description: "Текущая дата" },
  { label: "Контракт {{contract}}", value: "{{contract}}", description: "Номер контракта" },
  { label: "Партия {{batch}}", value: "{{batch}}", description: "Номер партии" },
  { label: "Количество {{qty}}", value: "{{qty}}", description: "Количество в упаковке" },
];

// Тип для пользовательских шрифтов
interface CustomFont {
  name: string;
  fontFamily: string;
  fontDataUrl: string;
}

// Ключ для localStorage пользовательских шрифтов
const CUSTOM_FONTS_STORAGE_KEY = "mes_label_custom_fonts";

// Источники данных для QR
const QR_SOURCES = [
  { 
    value: "code", 
    label: "Код товара", 
    template: "{{code}}",
    description: "В QR будет закодирован уникальный код товара",
    example: "7342511000501"
  },
  { 
    value: "serial", 
    label: "Серийный номер", 
    template: "{{serial}}",
    description: "В QR будет закодирован серийный номер изделия",
    example: "SN-2024-00813"
  },
  { 
    value: "name", 
    label: "Название товара", 
    template: "{{name}}",
    description: "В QR будет закодировано наименование",
    example: "Видеопередатчик ВП-500"
  },
  { 
    value: "contract", 
    label: "№ Контракта", 
    template: "{{contract}}",
    description: "В QR будет номер госконтракта",
    example: "187/249/9/П/25-63-ФЕ"
  },
  { 
    value: "url", 
    label: "Ссылка/URL", 
    template: "{{url}}",
    description: "В QR будет ссылка для сканирования",
    example: "https://mes.local/item/813"
  },
  { 
    value: "custom", 
    label: "Свой текст", 
    template: "",
    description: "Введите любой текст для кодирования",
    example: "Любой текст"
  },
];

// Форматы счётчика
const COUNTER_FORMATS = [
  { label: "1 / 100", value: "{{current}} / {{total}}", description: "Текущий номер / Всего" },
  { label: "1 из 100", value: "{{current}} из {{total}}", description: "Текущий номер из Всего" },
  { label: "#1", value: "#{{current}}", description: "Только текущий номер" },
  { label: "№ 1 (100)", value: "№ {{current}} ({{total}})", description: "С символом номера" },
  { label: "Этикетка 1/100", value: "Этикетка {{current}}/{{total}}", description: "С подписью" },
];

// Библиотека стандартных иконок по ГОСТ 14192-96 "Маркировка грузов"
const DEFAULT_ICON_LIBRARY = [
  { 
    type: "fragile", 
    label: "Хрупкое", 
    icon: Wine, 
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6 L18 17 Q18 24 25 24 Q32 24 32 17 L32 6" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
      <line x1="25" y1="24" x2="25" y2="38" stroke="#000" stroke-width="2"/>
      <line x1="18" y1="38" x2="32" y2="38" stroke="#000" stroke-width="2" stroke-linecap="round"/>
      <line x1="14" y1="44" x2="36" y2="44" stroke="#000" stroke-width="2" stroke-linecap="round"/>
    </svg>` 
  },
  { 
    type: "keep_dry", 
    label: "Влага", 
    icon: Umbrella, 
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <line x1="25" y1="4" x2="25" y2="10" stroke="#000" stroke-width="2"/>
      <path d="M6 22 Q6 8 25 8 Q44 8 44 22 Z" fill="none" stroke="#000" stroke-width="2"/>
      <path d="M25 22 L25 38 Q25 42 21 42" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
      <circle cx="11" cy="30" r="2" fill="#000"/>
      <circle cx="25" cy="34" r="2" fill="#000"/>
      <circle cx="39" cy="30" r="2" fill="#000"/>
      <circle cx="17" cy="40" r="2" fill="#000"/>
      <circle cx="33" cy="40" r="2" fill="#000"/>
    </svg>` 
  },
  { 
    type: "keep_away_heat", 
    label: "Нагрев", 
    icon: Flame, 
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <circle cx="25" cy="13" r="5" fill="none" stroke="#000" stroke-width="2"/>
      <line x1="25" y1="3" x2="25" y2="6" stroke="#000" stroke-width="2"/>
      <line x1="25" y1="20" x2="25" y2="23" stroke="#000" stroke-width="2"/>
      <line x1="14" y1="13" x2="17" y2="13" stroke="#000" stroke-width="2"/>
      <line x1="33" y1="13" x2="36" y2="13" stroke="#000" stroke-width="2"/>
      <line x1="17" y1="5" x2="19" y2="8" stroke="#000" stroke-width="2"/>
      <line x1="33" y1="5" x2="31" y2="8" stroke="#000" stroke-width="2"/>
      <line x1="17" y1="21" x2="19" y2="18" stroke="#000" stroke-width="2"/>
      <line x1="33" y1="21" x2="31" y2="18" stroke="#000" stroke-width="2"/>
      <path d="M8 46 L8 34 L25 26 L42 34 L42 46" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
    </svg>` 
  },
  { 
    type: "this_side_up", 
    label: "Верх", 
    icon: ArrowUp, 
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <polygon points="25,4 36,16 29,16 29,22 21,22 21,16 14,16" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
      <polygon points="25,26 36,38 29,38 29,44 21,44 21,38 14,38" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
    </svg>` 
  },
  { 
    type: "keep_frozen", 
    label: "Заморозка", 
    icon: Snowflake, 
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="12" width="10" height="24" rx="5" fill="none" stroke="#000" stroke-width="2"/>
      <circle cx="21" cy="32" r="5" fill="none" stroke="#000" stroke-width="2"/>
      <circle cx="21" cy="32" r="3" fill="#000"/>
      <line x1="21" y1="29" x2="21" y2="18" stroke="#000" stroke-width="2"/>
      <line x1="36" y1="12" x2="36" y2="28" stroke="#000" stroke-width="1.5"/>
      <line x1="28" y1="20" x2="44" y2="20" stroke="#000" stroke-width="1.5"/>
      <line x1="30" y1="14" x2="42" y2="26" stroke="#000" stroke-width="1.5"/>
      <line x1="42" y1="14" x2="30" y2="26" stroke="#000" stroke-width="1.5"/>
      <line x1="8" y1="44" x2="44" y2="44" stroke="#000" stroke-width="2"/>
      <text x="12" y="42" font-size="8" font-family="Arial, sans-serif" fill="#000">-18°C</text>
    </svg>` 
  },
  { 
    type: "warning", 
    label: "Внимание", 
    icon: AlertTriangle, 
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <polygon points="25,5 46,44 4,44" fill="none" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="25" y1="17" x2="25" y2="30" stroke="#000" stroke-width="3" stroke-linecap="round"/>
      <circle cx="25" cy="37" r="2.5" fill="#000"/>
    </svg>` 
  },
  { 
    type: "do_not_stack", 
    label: "Не штабелировать", 
    icon: Package, 
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="28" width="30" height="16" fill="none" stroke="#000" stroke-width="2"/>
      <rect x="14" y="14" width="22" height="12" fill="none" stroke="#000" stroke-width="2"/>
      <line x1="6" y1="6" x2="44" y2="44" stroke="#000" stroke-width="2.5"/>
    </svg>` 
  },
];

// Тип для пользовательских иконок
interface CustomIcon {
  type: string;
  label: string;
  imageUrl: string;
}

// Ключ для localStorage
const CUSTOM_ICONS_STORAGE_KEY = "mes_label_custom_icons";

const snap = (v: number) => Math.round(v / SNAP_MM) * SNAP_MM;
const round2 = (v: number) => Math.round(v * 100) / 100;

// ===== ГЛАВНЫЙ КОМПОНЕНТ =====
export const LabelConstructor: React.FC<Props> = ({
  initialName = "Новый шаблон",
  initialWidth = 105,
  initialHeight = 60,
  initialLayout = [],
  onSave,
  onClose,
}) => {
  // ===== STATE =====
  const [name, setName] = useState(initialName);
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight });
  
  // Нормализация элементов - добавляем fontFamily если его нет (для старых шаблонов)
  const normalizedLayout = useMemo(() => {
    return initialLayout.map(el => ({
      ...el,
      fontFamily: el.fontFamily || "Arial, sans-serif",
    }));
  }, [initialLayout]);
  
  const [elements, setElements] = useState<LabelElement[]>(normalizedLayout);
  
  // Синхронизация при изменении initialLayout (когда загружается другой шаблон)
  useEffect(() => {
    setElements(normalizedLayout);
  }, [normalizedLayout]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.5);
  const [showQrHelper, setShowQrHelper] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCounterPreview, setShowCounterPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // ===== НОВОЕ: состояния для редактирования размера шрифта =====
  const [fontSizeInput, setFontSizeInput] = useState<string>('');
  const [isEditingFontSize, setIsEditingFontSize] = useState(false);
  
  // Пользовательские иконки (загружаются из localStorage)
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_ICONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Пользовательские шрифты (загружаются из localStorage)
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_FONTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Сохранение пользовательских иконок в localStorage
  useEffect(() => {
    localStorage.setItem(CUSTOM_ICONS_STORAGE_KEY, JSON.stringify(customIcons));
  }, [customIcons]);

  // Сохранение и загрузка @font-face для пользовательских шрифтов
  useEffect(() => {
    localStorage.setItem(CUSTOM_FONTS_STORAGE_KEY, JSON.stringify(customFonts));
    
    // Динамически добавляем @font-face для каждого пользовательского шрифта
    customFonts.forEach((font) => {
      const styleId = `custom-font-${font.name.replace(/\s+/g, '-')}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: '${font.name}';
            src: url(${font.fontDataUrl});
          }
        `;
        document.head.appendChild(style);
      }
    });
  }, [customFonts]);

  // ===== REFS =====
  const elementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconUploadRef = useRef<HTMLInputElement>(null);
  const fontUploadRef = useRef<HTMLInputElement>(null);

  const stateRef = useRef({ elements, zoom, selectedId });
  useEffect(() => {
    stateRef.current = { elements, zoom, selectedId };
  }, [elements, zoom, selectedId]);

  // ===== DRAG ENGINE =====
  const dragInfo = useRef<{
    active: boolean;
    mode: "MOVE" | "RESIZE" | null;
    elId: string | null;
    startX: number;
    startY: number;
    initialItem: LabelElement | null;
  }>({
    active: false,
    mode: null,
    elId: null,
    startX: 0,
    startY: 0,
    initialItem: null,
  });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragInfo.current.active || !dragInfo.current.elId || !dragInfo.current.initialItem) return;

      const { startX, startY, initialItem, mode, elId } = dragInfo.current;
      const currentZoom = stateRef.current.zoom;

      const deltaXScreen = e.clientX - startX;
      const deltaYScreen = e.clientY - startY;

      const deltaXMm = deltaXScreen / (PX_PER_MM * currentZoom);
      const deltaYMm = deltaYScreen / (PX_PER_MM * currentZoom);

      const useSnap = e.shiftKey;

      let newX = initialItem.x;
      let newY = initialItem.y;
      let newW = initialItem.width;
      let newH = initialItem.height;

      if (mode === "MOVE") {
        newX = initialItem.x + deltaXMm;
        newY = initialItem.y + deltaYMm;

        if (useSnap) {
          newX = snap(newX);
          newY = snap(newY);
        } else {
          newX = round2(newX);
          newY = round2(newY);
        }

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
      } else if (mode === "RESIZE") {
        newW = initialItem.width + deltaXMm;
        newH = initialItem.height + deltaYMm;

        if (useSnap) {
          newW = snap(newW);
          newH = snap(newH);
        } else {
          newW = round2(newW);
          newH = round2(newH);
        }

        if (newW < MIN_MM) newW = MIN_MM;
        if (newH < MIN_MM) newH = MIN_MM;
      }

      const node = elementRefs.current.get(elId);
      if (node) {
        node.style.left = `${newX * PX_PER_MM * currentZoom}px`;
        node.style.top = `${newY * PX_PER_MM * currentZoom}px`;
        node.style.width = `${newW * PX_PER_MM * currentZoom}px`;
        node.style.height = `${newH * PX_PER_MM * currentZoom}px`;

        const tooltip = node.querySelector(".resize-tooltip") as HTMLElement;
        if (tooltip) {
          tooltip.textContent = `${newW.toFixed(1)} × ${newH.toFixed(1)} мм`;
        }

        (node as any).dataset.lastMm = JSON.stringify({ x: newX, y: newY, w: newW, h: newH });
      }
    };

    const handlePointerUp = () => {
      if (!dragInfo.current.active) return;

      const { elId, mode, initialItem } = dragInfo.current;
      const node = elId ? elementRefs.current.get(elId) : null;

      if (node && elId) {
        const lastMm = (node as any).dataset.lastMm;
        const finalData = lastMm ? JSON.parse(lastMm) : { x: initialItem?.x, y: initialItem?.y, w: initialItem?.width, h: initialItem?.height };

        setElements((prev) =>
          prev.map((el) => {
            if (el.id === elId) {
              const updated = { ...el, x: finalData.x, y: finalData.y, width: finalData.w, height: finalData.h };

              if (mode === "RESIZE" && el.type === "TEXT" && initialItem?.height !== finalData.h) {
                updated.fontSize = Math.max(6, Math.round(finalData.h * 2.8));
              }
              return updated;
            }
            return el;
          })
        );

        delete (node as any).dataset.lastMm;
      }

      dragInfo.current = {
        active: false,
        mode: null,
        elId: null,
        startX: 0,
        startY: 0,
        initialItem: null,
      };
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleStartDrag = (e: React.PointerEvent, id: string, mode: "MOVE" | "RESIZE") => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const el = elements.find((x) => x.id === id);
    if (!el) return;

    setSelectedId(id);

    dragInfo.current = {
      active: true,
      mode,
      elId: id,
      startX: e.clientX,
      startY: e.clientY,
      initialItem: { ...el },
    };
  };

  // ===== CRUD =====
  const addElement = (type: LabelElementType, extra: Partial<LabelElement> = {}) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);

    const defaultSizes: Record<LabelElementType, { w: number; h: number }> = {
      TEXT: { w: 30, h: 10 },
      QR: { w: 20, h: 20 },
      LINE: { w: 30, h: 2 },
      RECTANGLE: { w: 30, h: 20 },
      IMAGE: { w: 20, h: 20 },
      COUNTER: { w: 25, h: 8 },
      ICON: { w: 15, h: 15 },
    };

    const defaults = defaultSizes[type] || { w: 20, h: 20 };

    const newEl: LabelElement = {
      id,
      type,
      x: 5,
      y: 5,
      width: defaults.w,
      height: defaults.h,
      fontSize: 10,
      fontFamily: "Arial, sans-serif",
      strokeWidth: 0.3,
      align: "left",
      isBold: false,
      content: type === "TEXT" ? "Текст" : type === "QR" ? "{{code}}" : type === "COUNTER" ? "{{current}} / {{total}}" : "",
      qrSource: type === "QR" ? "code" : undefined,
      qrDescription: type === "QR" ? "Код товара" : undefined,
      counterFormat: type === "COUNTER" ? "{{current}} / {{total}}" : undefined,
      ...extra,
    };

    setElements((prev) => {
      if (type === "RECTANGLE" || type === "LINE") return [newEl, ...prev];
      return [...prev, newEl];
    });

    setSelectedId(id);
  };

  const updateSelected = (updates: Partial<LabelElement>) => {
    if (!selectedId) return;
    setElements((prev) => prev.map((el) => (el.id === selectedId ? { ...el, ...updates } : el)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  // Загрузка изображения
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Выберите файл изображения");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      addElement("IMAGE", {
        imageUrl: dataUrl,
        imageName: file.name,
        width: 20,
        height: 20,
      });
      toast.success(`Изображение "${file.name}" добавлено`);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  }, []);

  // Загрузка пользовательской иконки в библиотеку
  const handleIconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Выберите файл изображения");
      return;
    }

    if (file.size > 100 * 1024) {
      toast.error("Иконка слишком большая (макс. 100KB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const iconName = file.name.replace(/\.[^.]+$/, "");
      const iconType = `custom_${Date.now()}`;
      
      setCustomIcons(prev => [...prev, {
        type: iconType,
        label: iconName,
        imageUrl: dataUrl,
      }]);
      
      toast.success(`Иконка "${iconName}" добавлена в библиотеку`);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  }, []);

  // Удаление пользовательской иконки из библиотеки
  const deleteCustomIcon = useCallback((iconType: string) => {
    setCustomIcons(prev => prev.filter(i => i.type !== iconType));
    toast.success("Иконка удалена из библиотеки");
  }, []);

  // Загрузка пользовательского шрифта
  const handleFontUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
      toast.error("Поддерживаются только TTF, OTF, WOFF, WOFF2");
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Максимальный размер шрифта 2MB");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const fontDataUrl = reader.result as string;
      const fontName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
      
      if (customFonts.find(f => f.name === fontName)) {
        toast.error("Шрифт с таким именем уже загружен");
        return;
      }
      
      setCustomFonts((prev) => [...prev, {
        name: fontName,
        fontFamily: `'${fontName}', sans-serif`,
        fontDataUrl,
      }]);
      toast.success(`Шрифт "${fontName}" загружен`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [customFonts]);

  // Удаление пользовательского шрифта
  const deleteCustomFont = useCallback((fontName: string) => {
    setCustomFonts((prev) => prev.filter((f) => f.name !== fontName));
    const styleEl = document.getElementById(`custom-font-${fontName.replace(/\s+/g, '-')}`);
    if (styleEl) styleEl.remove();
    toast.success("Шрифт удалён");
  }, []);

  const activeElement = elements.find((el) => el.id === selectedId);

  const gridBgSize = PX_PER_MM * zoom * 5;

  // Получить описание QR для отображения
  const getQrDisplayInfo = (el: LabelElement) => {
    const source = QR_SOURCES.find(s => s.value === el.qrSource);
    return source || QR_SOURCES[0];
  };

  return (
    <div className="flex flex-col h-[90vh] bg-gradient-to-br from-slate-100 to-slate-200 font-sans text-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-300 select-none">
      {/* Скрытый input для загрузки изображений */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      
      {/* Скрытый input для загрузки иконок в библиотеку */}
      <input
        ref={iconUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleIconUpload}
      />

      {/* Скрытый input для загрузки шрифтов */}
      <input
        ref={fontUploadRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={handleFontUpload}
      />

      {/* --- TOP BAR --- */}
      <div className="h-auto min-h-[64px] bg-white border-b flex flex-wrap items-center px-4 py-2 justify-between shrink-0 z-20 shadow-sm gap-2">
        {/* Инструменты */}
        <div className="flex gap-1 flex-wrap">
          <ToolBtn icon={<Type />} label="Текст" onClick={() => addElement("TEXT")} />
          
          {/* QR с описанием */}
          <div className="relative">
            <ToolBtn 
              icon={<QrCode />} 
              label="QR" 
              onClick={() => {
                addElement("QR", { width: 20, height: 20 });
                setShowQrHelper(true);
              }} 
            />
          </div>

          {/* Счётчик/Нумератор */}
          <ToolBtn 
            icon={<Hash />} 
            label="Счётчик" 
            onClick={() => addElement("COUNTER", { width: 25, height: 8 })}
            title="Нумерация этикеток: 1/100, 2/100..."
          />

          <div className="w-px h-8 bg-slate-200 mx-1 self-center"></div>

          {/* Загрузка картинки */}
          <ToolBtn 
            icon={<Upload />} 
            label="Картинка" 
            onClick={() => fileInputRef.current?.click()}
            title="Загрузить своё изображение"
          />

          {/* Библиотека иконок */}
          <div className="relative">
            <ToolBtn 
              icon={<Library />} 
              label="Иконки" 
              onClick={() => setShowIconPicker(!showIconPicker)}
              title="Стандартные символы для этикеток"
            />
            
            {/* Выпадающий список иконок */}
            {showIconPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 w-72 max-h-96 overflow-y-auto">
                {/* Стандартные иконки */}
                <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Стандартные символы (ГОСТ 14192)</div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {DEFAULT_ICON_LIBRARY.map((iconItem) => (
                    <button
                      key={iconItem.type}
                      onClick={() => {
                        addElement("ICON", { 
                          iconType: iconItem.type, 
                          content: iconItem.label,
                          width: 15,
                          height: 15
                        });
                        setShowIconPicker(false);
                      }}
                      className="flex flex-col items-center p-2 hover:bg-indigo-50 rounded-lg transition-colors group border border-transparent hover:border-indigo-200"
                      title={iconItem.label}
                    >
                      <div 
                        className="w-8 h-8" 
                        dangerouslySetInnerHTML={{ __html: iconItem.svg }}
                      />
                      <span className="text-[8px] mt-1 text-slate-500 group-hover:text-indigo-600 text-center leading-tight">
                        {iconItem.label}
                      </span>
                    </button>
                  ))}
                </div>
                
                {/* Пользовательские иконки */}
                {customIcons.length > 0 && (
                  <>
                    <div className="text-xs font-bold text-emerald-600 mb-2 uppercase border-t pt-2">Мои иконки</div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {customIcons.map((iconItem) => (
                        <div key={iconItem.type} className="relative group">
                          <button
                            onClick={() => {
                              addElement("ICON", { 
                                iconType: iconItem.type, 
                                content: iconItem.label,
                                imageUrl: iconItem.imageUrl,
                                width: 15,
                                height: 15
                              });
                              setShowIconPicker(false);
                            }}
                            className="flex flex-col items-center p-2 hover:bg-emerald-50 rounded-lg transition-colors w-full"
                            title={iconItem.label}
                          >
                            <img src={iconItem.imageUrl} alt={iconItem.label} className="w-6 h-6 object-contain" />
                            <span className="text-[8px] mt-1 text-slate-500 text-center leading-tight truncate w-full">
                              {iconItem.label}
                            </span>
                          </button>
                          {/* Кнопка удаления */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomIcon(iconItem.type);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                            title="Удалить иконку"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {/* Кнопка загрузки своей иконки */}
                <button
                  onClick={() => iconUploadRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-sm"
                >
                  <Upload size={16} />
                  <span>Загрузить свою иконку</span>
                </button>
                <div className="text-[10px] text-slate-400 text-center mt-1">PNG/SVG, макс. 100KB</div>
              </div>
            )}
          </div>

          <div className="w-px h-8 bg-slate-200 mx-1 self-center"></div>

          {/* Линия */}
          <ToolBtn 
            icon={<Minus />} 
            label="Линия" 
            onClick={() => addElement("LINE", { width: 30, height: 0.5, strokeWidth: 0.3 })} 
          />

          {/* Рамка */}
          <ToolBtn 
            icon={<Square />} 
            label="Рамка" 
            onClick={() => addElement("RECTANGLE", { strokeWidth: 0.3 })} 
          />

          <div className="w-px h-8 bg-slate-200 mx-1 self-center"></div>

          {/* Зум */}
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="p-1 hover:bg-slate-200 rounded" type="button">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-medium w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="p-1 hover:bg-slate-200 rounded" type="button">
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        {/* Правая часть - Справка и Закрыть */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              showHelp ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
            type="button"
          >
            <HelpCircle size={18} />
            <span className="hidden sm:inline">Справка</span>
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Закрыть конструктор"
              type="button"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* --- PROPS PANEL (отдельная строка) --- */}
      {activeElement && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b px-4 py-3 shrink-0 z-10">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Заголовок с типом элемента */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm">
              {activeElement.type === "TEXT" && <Type size={16} className="text-indigo-600" />}
              {activeElement.type === "QR" && <QrCode size={16} className="text-indigo-600" />}
              {activeElement.type === "IMAGE" && <ImageIcon size={16} className="text-indigo-600" />}
              {activeElement.type === "COUNTER" && <Hash size={16} className="text-indigo-600" />}
              {activeElement.type === "ICON" && <Library size={16} className="text-indigo-600" />}
              {(activeElement.type === "LINE" || activeElement.type === "RECTANGLE") && <Layers size={16} className="text-indigo-600" />}
              <span className="text-xs font-bold text-indigo-800 uppercase">
                {activeElement.type === "TEXT" && "Текст"}
                {activeElement.type === "QR" && "QR-код"}
                {activeElement.type === "IMAGE" && "Изображение"}
                {activeElement.type === "COUNTER" && "Счётчик"}
                {activeElement.type === "ICON" && "Иконка"}
                {activeElement.type === "LINE" && "Линия"}
                {activeElement.type === "RECTANGLE" && "Рамка"}
              </span>
            </div>

            {/* TEXT редактор */}
            {activeElement.type === "TEXT" && (
              <>
                {/* Поле ввода текста */}
                <div className="relative shrink-0" style={{ width: '220px' }}>
                  <textarea
                    value={activeElement.content || ""}
                    onChange={(e) => updateSelected({ content: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-indigo-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white shadow-sm resize-none"
                    placeholder="Введите текст..."
                    rows={1}
                    style={{ 
                      minHeight: '38px',
                      height: 'auto',
                      maxHeight: '80px',
                      overflow: 'auto'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '38px';
                      target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                {/* Кнопка добавления переменной */}
                <div className="relative shrink-0">
                  <select
                    className="text-sm pl-3 pr-7 py-2 border border-indigo-200 rounded-lg bg-white cursor-pointer hover:border-indigo-400 outline-none appearance-none"
                    style={{ width: '130px' }}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) updateSelected({ content: (activeElement.content || "") + e.target.value });
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">+ Переменная</option>
                    {TEXT_VARIABLES.filter(v => v.value).map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                  <Database size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                </div>

                {/* Выбор шрифта */}
                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={activeElement.fontFamily ?? "Arial, sans-serif"}
                    onChange={(e) => {
                      const newFont = e.target.value;
                      updateSelected({ fontFamily: newFont });
                    }}
                    className="text-sm px-2 py-2 border border-indigo-200 rounded-lg bg-white cursor-pointer hover:border-indigo-400 outline-none shadow-sm"
                    style={{ width: '130px' }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <optgroup label="Стандартные">
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="'Times New Roman', serif">Times New Roman</option>
                      <option value="'Courier New', monospace">Courier New</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                      <option value="Tahoma, sans-serif">Tahoma</option>
                    </optgroup>
                    <optgroup label="ГОСТ">
                      <option value="'GOST type A', sans-serif">GOST type A</option>
                      <option value="'GOST type B', sans-serif">GOST type B</option>
                    </optgroup>
                    {customFonts.length > 0 && (
                      <optgroup label="Мои шрифты">
                        {customFonts.map((f) => (
                          <option key={f.name} value={f.fontFamily}>{f.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fontUploadRef.current?.click();
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Загрузить свой шрифт (TTF, OTF, WOFF)"
                    type="button"
                  >
                    <Upload size={16} />
                  </button>
                </div>

                {/* ===== ИСПРАВЛЕНО: Размер шрифта - с возможностью ввода ===== */}
                <div className="flex items-center bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                  <button 
                    onClick={() => updateSelected({ fontSize: Math.max(6, (activeElement.fontSize || 10) - 1) })} 
                    className="px-3 py-2 hover:bg-slate-50 text-sm font-bold text-indigo-600" 
                    type="button"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={isEditingFontSize ? fontSizeInput : (activeElement.fontSize || 10)}
                    onFocus={(e) => {
                      setIsEditingFontSize(true);
                      setFontSizeInput(String(activeElement.fontSize || 10));
                      e.target.select();
                    }}
                    onChange={(e) => {
                      // Разрешаем только цифры
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setFontSizeInput(value);
                    }}
                    onBlur={() => {
                      setIsEditingFontSize(false);
                      const val = parseInt(fontSizeInput);
                      if (!isNaN(val) && val >= 6 && val <= 200) {
                        updateSelected({ fontSize: val });
                      }
                      // Если невалидно - просто вернётся к предыдущему значению
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur(); // Применить по Enter
                      }
                      if (e.key === 'Escape') {
                        setIsEditingFontSize(false);
                        setFontSizeInput('');
                      }
                    }}
                    className="w-14 text-sm font-bold text-center tabular-nums border-x border-indigo-100 py-2 outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-300"
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                  <button 
                    onClick={() => updateSelected({ fontSize: Math.min(200, (activeElement.fontSize || 10) + 1) })} 
                    className="px-3 py-2 hover:bg-slate-50 text-sm font-bold text-indigo-600" 
                    type="button"
                  >
                    +
                  </button>
                </div>

                {/* Bold */}
                <button
                  onClick={() => updateSelected({ isBold: !activeElement.isBold })}
                  className={clsx(
                    "w-9 h-9 border rounded-lg flex items-center justify-center font-bold transition-all shadow-sm",
                    activeElement.isBold ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-indigo-200 hover:bg-slate-50"
                  )}
                  type="button"
                >
                  B
                </button>

                {/* Выравнивание */}
                <div className="flex bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                  {["left", "center", "right"].map((align) => (
                    <button
                      key={align}
                      onClick={() => updateSelected({ align: align as "left" | "center" | "right" })}
                      className={clsx("p-2 hover:bg-slate-50", activeElement.align === align && "bg-indigo-100 text-indigo-700")}
                      type="button"
                    >
                      {align === "left" && <AlignLeft size={16} />}
                      {align === "center" && <AlignCenter size={16} />}
                      {align === "right" && <AlignRight size={16} />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* QR редактор с описанием */}
            {activeElement.type === "QR" && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase">Что будет в QR:</label>
                  <select
                    value={activeElement.qrSource || "code"}
                    onChange={(e) => {
                      const source = QR_SOURCES.find(s => s.value === e.target.value);
                      if (source) {
                        updateSelected({ 
                          qrSource: e.target.value as any,
                          content: source.template,
                          qrDescription: source.label
                        });
                      }
                    }}
                    className="text-sm px-3 py-2 border border-indigo-200 rounded-lg bg-white cursor-pointer hover:border-indigo-400 outline-none shadow-sm min-w-[180px]"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {QR_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {activeElement.qrSource === "custom" && (
                  <input
                    value={activeElement.content || ""}
                    onChange={(e) => updateSelected({ content: e.target.value })}
                    className="w-48 text-sm px-3 py-2 border border-indigo-200 rounded-lg focus:border-indigo-500 outline-none bg-white shadow-sm"
                    placeholder="Введите текст для QR..."
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                )}

                {/* Информационная подсказка */}
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 max-w-sm">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <div className="font-semibold">{getQrDisplayInfo(activeElement).description}</div>
                    <div className="text-blue-500 mt-0.5">Пример: {getQrDisplayInfo(activeElement).example}</div>
                  </div>
                </div>
              </div>
            )}

            {/* COUNTER редактор */}
            {activeElement.type === "COUNTER" && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase">Формат нумерации:</label>
                  <select
                    value={activeElement.counterFormat || COUNTER_FORMATS[0].value}
                    onChange={(e) => updateSelected({ counterFormat: e.target.value, content: e.target.value })}
                    className="text-sm px-3 py-2 border border-indigo-200 rounded-lg bg-white cursor-pointer hover:border-indigo-400 outline-none shadow-sm min-w-[200px]"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {COUNTER_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label} — {f.description}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                  <button onClick={() => updateSelected({ fontSize: Math.max(6, (activeElement.fontSize || 14) - 1) })} className="px-3 py-2 hover:bg-slate-50 text-sm font-bold" type="button">−</button>
                  <span className="text-sm font-bold w-8 text-center tabular-nums border-x border-indigo-100">{activeElement.fontSize || 14}</span>
                  <button onClick={() => updateSelected({ fontSize: (activeElement.fontSize || 14) + 1 })} className="px-3 py-2 hover:bg-slate-50 text-sm font-bold" type="button">+</button>
                </div>

                <button
                  onClick={() => updateSelected({ isBold: !activeElement.isBold })}
                  className={clsx(
                    "w-9 h-9 border rounded-lg flex items-center justify-center font-bold transition-all shadow-sm",
                    activeElement.isBold ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-indigo-200 hover:bg-slate-50"
                  )}
                  type="button"
                >B</button>

                {/* Превью */}
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <Eye size={14} className="text-emerald-600" />
                  <span className="text-sm font-mono font-bold text-emerald-800">
                    {(activeElement.counterFormat || "{{current}} / {{total}}")
                      .replace("{{current}}", "1")
                      .replace("{{total}}", "100")}
                  </span>
                </div>
              </div>
            )}

            {/* IMAGE info */}
            {activeElement.type === "IMAGE" && activeElement.imageName && (
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                <ImageIcon size={16} className="text-slate-500" />
                <span className="text-sm text-slate-600 truncate max-w-[200px]">{activeElement.imageName}</span>
              </div>
            )}

            {/* ICON info */}
            {activeElement.type === "ICON" && (
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium text-slate-600">{activeElement.content || "Иконка"}</span>
              </div>
            )}

            {/* LINE/RECT толщина */}
            {(activeElement.type === "LINE" || activeElement.type === "RECTANGLE") && (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-indigo-200 shadow-sm">
                <span className="text-xs text-indigo-900 font-medium">Толщина:</span>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={activeElement.strokeWidth}
                  onChange={(e) => updateSelected({ strokeWidth: parseFloat(e.target.value) })}
                  className="w-14 text-sm border-b border-indigo-300 px-1 py-0.5 text-center focus:outline-none focus:border-indigo-600 bg-transparent"
                  onPointerDown={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-slate-400">мм</span>
              </div>
            )}

            <div className="flex-1"></div>

            {/* Удалить */}
            <button
              onClick={deleteSelected}
              className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-red-200"
              title="Удалить элемент"
              type="button"
            >
              <Trash2 size={18} />
              <span className="text-sm font-medium">Удалить</span>
            </button>
          </div>
        </div>
      )}

      {/* Подсказка если ничего не выбрано */}
      {!activeElement && (
        <div className="bg-slate-50 border-b px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <MousePointer2 size={16} />
            <span>Выберите элемент на этикетке для редактирования или добавьте новый с панели инструментов</span>
          </div>
        </div>
      )}

      {/* --- CANVAS + HELP PANEL --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div
          className="flex-1 overflow-auto bg-slate-300/50 flex items-center justify-center relative touch-none p-8"
          style={{
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          onPointerDown={() => {
            setSelectedId(null);
            setShowIconPicker(false);
          }}
        >
        <div
          className="bg-white shadow-2xl relative transition-transform duration-75 rounded-sm"
          style={{
            width: size.w * PX_PER_MM * zoom,
            height: size.h * PX_PER_MM * zoom,
            backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
            backgroundSize: `${gridBgSize}px ${gridBgSize}px`,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {elements.map((el, idx) => {
            const isSelected = selectedId === el.id;

            const style: React.CSSProperties = {
              left: `${el.x * PX_PER_MM * zoom}px`,
              top: `${el.y * PX_PER_MM * zoom}px`,
              width: `${el.width * PX_PER_MM * zoom}px`,
              height: `${el.height * PX_PER_MM * zoom}px`,
              zIndex: isSelected ? 9999 : idx + 1,
            };

            const strokePx = (el.strokeWidth || 0.1) * PX_PER_MM * zoom;

            return (
              <div
                key={el.id}
                ref={(node) => {
                  if (node) elementRefs.current.set(el.id, node);
                  else elementRefs.current.delete(el.id);
                }}
                className={clsx(
                  "absolute box-border transition-shadow",
                  isSelected 
                    ? "outline outline-2 outline-indigo-500 shadow-lg shadow-indigo-200/50" 
                    : "hover:outline hover:outline-1 hover:outline-indigo-300"
                )}
                style={style}
                onPointerDown={(e) => handleStartDrag(e, el.id, "MOVE")}
              >
                {/* TEXT */}
                {el.type === "TEXT" && (
                  <div
                    className="w-full h-full whitespace-pre-wrap break-words leading-none pointer-events-none overflow-hidden"
                    style={{
                      fontSize: `${(el.fontSize || 10) * PX_PER_MM * zoom * 0.35}px`,
                      fontWeight: el.isBold ? "bold" : "normal",
                      fontFamily: el.fontFamily || "Arial, sans-serif",
                      textAlign: el.align,
                      color: "#1e293b",
                    }}
                  >
                    {el.content}
                  </div>
                )}

                {/* QR */}
                {el.type === "QR" && (
                  <div className="w-full h-full p-[2px] pointer-events-none flex items-center justify-center bg-white rounded-sm">
                    <QRCode value={el.content || "QR"} style={{ width: "100%", height: "100%" }} viewBox="0 0 256 256" />
                  </div>
                )}

                {/* IMAGE */}
                {el.type === "IMAGE" && (
                  <div className="w-full h-full pointer-events-none flex items-center justify-center bg-slate-50 rounded-sm overflow-hidden">
                    {el.imageUrl ? (
                      <img src={el.imageUrl} alt={el.imageName || "Image"} className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon size={24} className="text-slate-300" />
                    )}
                  </div>
                )}

                {/* COUNTER */}
                {el.type === "COUNTER" && (
                  <div
                    className="w-full h-full whitespace-nowrap pointer-events-none flex items-center justify-center overflow-hidden"
                    style={{
                      fontSize: `${(el.fontSize || 14) * PX_PER_MM * zoom * 0.35}px`,
                      fontWeight: el.isBold ? "bold" : "normal",
                      color: "#1e293b",
                      fontFamily: "monospace",
                    }}
                  >
                    {(el.counterFormat || "{{current}} / {{total}}")
                      .replace("{{current}}", "1")
                      .replace("{{total}}", "100")}
                  </div>
                )}

                {/* ICON */}
                {el.type === "ICON" && (
                  <div className="w-full h-full pointer-events-none flex items-center justify-center p-0.5">
                    {(() => {
                      const iconData = DEFAULT_ICON_LIBRARY.find(i => i.type === el.iconType);
                      if (iconData && iconData.svg) {
                        return (
                          <div 
                            className="w-full h-full"
                            dangerouslySetInnerHTML={{ __html: iconData.svg }}
                          />
                        );
                      }
                      
                      if (el.imageUrl) {
                        return <img src={el.imageUrl} alt={el.content || 'Icon'} className="w-full h-full object-contain" />;
                      }
                      
                      const customIcon = customIcons.find(i => i.type === el.iconType);
                      if (customIcon) {
                        return <img src={customIcon.imageUrl} alt={customIcon.label} className="w-full h-full object-contain" />;
                      }
                      
                      return <AlertTriangle size={20} className="text-slate-400" />;
                    })()}
                  </div>
                )}

                {/* LINE / RECT */}
                {(el.type === "LINE" || el.type === "RECTANGLE") && (
                  <svg className="w-full h-full pointer-events-none overflow-visible" xmlns="http://www.w3.org/2000/svg">
                    {el.type === "RECTANGLE" ? (
                      <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="black" strokeWidth={strokePx} vectorEffect="non-scaling-stroke" />
                    ) : el.width >= el.height ? (
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="black" strokeWidth={strokePx} vectorEffect="non-scaling-stroke" />
                    ) : (
                      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="black" strokeWidth={strokePx} vectorEffect="non-scaling-stroke" />
                    )}
                  </svg>
                )}

                {/* RESIZE HANDLE */}
                {isSelected && (
                  <>
                    <div
                      className="absolute -bottom-2 -right-2 w-5 h-5 bg-indigo-600 rounded-full cursor-nwse-resize flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
                      onPointerDown={(e) => handleStartDrag(e, el.id, "RESIZE")}
                    >
                      <GripHorizontal size={12} className="text-white -rotate-45" />
                    </div>

                    <div className="resize-tooltip absolute -top-7 left-0 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-md opacity-90 pointer-events-none whitespace-nowrap shadow-md font-mono">
                      {el.width.toFixed(1)} × {el.height.toFixed(1)} мм
                    </div>

                    {/* Метка типа элемента */}
                    <div className="absolute -top-7 right-0 bg-slate-700 text-white text-[9px] px-1.5 py-0.5 rounded opacity-80 pointer-events-none uppercase font-bold">
                      {el.type === "QR" && el.qrSource && `QR: ${QR_SOURCES.find(s => s.value === el.qrSource)?.label || el.qrSource}`}
                      {el.type === "COUNTER" && "Счётчик"}
                      {el.type === "IMAGE" && "Картинка"}
                      {el.type === "ICON" && el.content}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- HELP PANEL (боковая справка) --- */}
      {showHelp && (
        <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto shrink-0 shadow-lg">
          <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-amber-600" />
              <span className="font-bold text-amber-900">Справка</span>
            </div>
            <button 
              onClick={() => setShowHelp(false)} 
              className="p-1 hover:bg-amber-100 rounded text-amber-600"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="p-4 space-y-5 text-sm">
            {/* Переменные */}
            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                <Database size={18} className="text-indigo-500" />
                Переменные (подставятся автоматически)
              </h3>
              <div className="space-y-2">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <code className="text-blue-700 font-bold text-sm">{"{{code}}"}</code>
                  <p className="text-slate-600 mt-1">Уникальный код товара</p>
                  <p className="text-slate-400 text-xs mt-1">Пример: 7342511000501</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <code className="text-blue-700 font-bold text-sm">{"{{name}}"}</code>
                  <p className="text-slate-600 mt-1">Наименование товара</p>
                  <p className="text-slate-400 text-xs mt-1">Пример: Приёмник 2xLR1121</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <code className="text-blue-700 font-bold text-sm">{"{{contract}}"}</code>
                  <p className="text-slate-600 mt-1">Номер госконтракта</p>
                  <p className="text-slate-400 text-xs mt-1">Пример: № 249/2/ОП/25/1/37</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <code className="text-blue-700 font-bold text-sm">{"{{date}}"}</code>
                  <p className="text-slate-600 mt-1">Текущая дата</p>
                  <p className="text-slate-400 text-xs mt-1">Пример: 20.01.2026, 15:30</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <code className="text-blue-700 font-bold text-sm">{"{{quantity}}"}</code>
                  <p className="text-slate-600 mt-1">Количество</p>
                  <p className="text-slate-400 text-xs mt-1">Пример: 500</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <code className="text-blue-700 font-bold text-sm">{"{{unit}}"}</code>
                  <p className="text-slate-600 mt-1">Единица измерения</p>
                  <p className="text-slate-400 text-xs mt-1">Пример: шт.</p>
                </div>
              </div>
            </div>

            {/* Счётчик */}
            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                <Hash size={18} className="text-emerald-500" />
                Счётчик (нумерация этикеток)
              </h3>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 space-y-2">
                <p className="text-slate-600">При печати 100 этикеток:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <span className="text-emerald-700 font-mono">1 / 100</span>
                    <span className="text-slate-400 ml-2">← первая</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-emerald-700 font-mono">2 / 100</span>
                    <span className="text-slate-400 ml-2">← вторая</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-emerald-700 font-mono">...</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="text-emerald-700 font-mono">100 / 100</span>
                    <span className="text-slate-400 ml-2">← последняя</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  <code className="text-emerald-600">{"{{current}}"}</code> — номер текущей этикетки<br/>
                  <code className="text-emerald-600">{"{{total}}"}</code> — всего этикеток в тираже
                </div>
              </div>
            </div>

            {/* QR-код */}
            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                <QrCode size={18} className="text-violet-500" />
                QR-код
              </h3>
              <div className="bg-violet-50 p-3 rounded-lg border border-violet-100">
                <p className="text-slate-600">При добавлении QR выберите, что в нём будет закодировано:</p>
                <ul className="mt-2 text-xs text-slate-600 space-y-1">
                  <li>• <strong>Код товара</strong> — уникальный идентификатор</li>
                  <li>• <strong>Серийный номер</strong> — для отслеживания</li>
                  <li>• <strong>Госконтракт</strong> — номер договора</li>
                  <li>• <strong>Ссылка</strong> — URL для сканирования</li>
                  <li>• <strong>Свой текст</strong> — любой текст</li>
                </ul>
              </div>
            </div>

            {/* Иконки */}
            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                <Library size={18} className="text-orange-500" />
                Иконки маркировки
              </h3>
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                <p className="text-slate-600 mb-2">Стандартные символы по ГОСТ:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 bg-white p-2 rounded border">
                    <Wine size={16} className="text-slate-600" />
                    <span>Хрупкое</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border">
                    <Umbrella size={16} className="text-slate-600" />
                    <span>Влага</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border">
                    <Flame size={16} className="text-slate-600" />
                    <span>Нагрев</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border">
                    <ArrowUp size={16} className="text-slate-600" />
                    <span>Верх</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border">
                    <Snowflake size={16} className="text-slate-600" />
                    <span>Заморозка</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border">
                    <AlertTriangle size={16} className="text-slate-600" />
                    <span>Внимание</span>
                  </div>
                </div>
                <p className="text-slate-500 text-xs mt-2">+ можно загрузить свои иконки</p>
              </div>
            </div>

            {/* Советы */}
            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                <Info size={18} className="text-cyan-500" />
                Советы
              </h3>
              <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-100 text-xs text-slate-600 space-y-2">
                <p>• <strong>Shift + тянуть</strong> — привязка к сетке 5мм</p>
                <p>• Выберите элемент, чтобы изменить его свойства</p>
                <p>• Переменные в двойных скобках <code className="text-cyan-700">{"{{}}"}</code> заменятся при печати</p>
                <p>• Сохраните шаблон, чтобы использовать повторно</p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* --- FOOTER --- */}
      <div className="bg-white border-t px-4 py-3 flex items-center justify-between shrink-0 z-20 gap-4 flex-wrap">
        <div className="flex gap-4 text-sm items-center">
          <label className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border">
            <span className="font-bold text-indigo-600">Ш:</span>
            <input
              type="number"
              value={size.w}
              onChange={(e) => setSize({ ...size, w: +e.target.value })}
              className="bg-transparent w-12 text-center outline-none font-medium"
            />
            <span className="text-slate-400">мм</span>
          </label>
          <label className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border">
            <span className="font-bold text-indigo-600">В:</span>
            <input
              type="number"
              value={size.h}
              onChange={(e) => setSize({ ...size, h: +e.target.value })}
              className="bg-transparent w-12 text-center outline-none font-medium"
            />
            <span className="text-slate-400">мм</span>
          </label>
          <span className="text-slate-400 hidden sm:inline">Shift = привязка к сетке</span>
        </div>

        <div className="flex gap-3 items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm w-56 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            placeholder="Название шаблона..."
          />
          <button
            onClick={() => {
              if (!onSave) {
                toast.error("onSave не передан");
                return;
              }
              onSave(name, size.w, size.h, elements);
              toast.success("Шаблон сохранён!");
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            type="button"
          >
            <Save size={18} /> Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== КОМПОНЕНТ КНОПКИ ТУЛБАРА =====
const ToolBtn = ({ icon, label, onClick, title }: { icon: React.ReactElement; label: string; onClick: () => void; title?: string }) => (
  <button
    onClick={onClick}
    type="button"
    title={title}
    className="flex flex-col items-center justify-center w-14 h-14 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-all group border border-transparent hover:border-indigo-200"
  >
    <div className="group-hover:-translate-y-0.5 transition-transform">
      {React.cloneElement(icon, { size: 22 })}
    </div>
    <span className="text-[10px] mt-1 font-medium">{label}</span>
  </button>
);

export default LabelConstructor;