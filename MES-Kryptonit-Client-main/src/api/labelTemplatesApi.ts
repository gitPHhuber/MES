import { $authHost } from "./index";

// Типы элементов, которые могут быть на этикетке
export type LabelElementType = "TEXT" | "QR" | "LINE" | "RECTANGLE";

export interface LabelElement {
    id: string;
    type: LabelElementType;
    
    // Координаты и размеры (в миллиметрах)
    x: number; 
    y: number; 
    width: number; 
    height: number; 

    // Свойства текста
    fontSize?: number; // размер шрифта в pt
    content: string; // Сам текст или имя переменной {{variable}}
    dataSource: "STATIC" | "VARIABLE"; // Источник данных
    align?: "left" | "center" | "right"; // Выравнивание
    isBold?: boolean; // Жирный шрифт

    // Свойства графики (Линии и Рамки)
    strokeWidth?: number; // Толщина линии/границы
}

// Модель шаблона, как она хранится в БД
export interface LabelTemplateModel {
    id: number;
    name: string;
    width: number;
    height: number;
    layout: LabelElement[]; // Массив элементов (JSON)
    createdAt?: string;
}

// === API ЗАПРОСЫ ===

// 1. Получить все шаблоны
export const fetchLabelTemplates = async () => {
    // TODO: Раскомментировать, когда на бэкенде будет готов роут /label-templates
    // const { data } = await $authHost.get('api/warehouse/label-templates');
    // return data as LabelTemplateModel[];

    // --- ВРЕМЕННАЯ ИМИТАЦИЯ БД (LocalStorage) ---
    // Используется для тестирования интерфейса без бэкенда
    return new Promise<LabelTemplateModel[]>((resolve) => {
        const stored = localStorage.getItem("db_label_templates_mock");
        resolve(stored ? JSON.parse(stored) : []);
    });
};

// 2. Создать шаблон
export const createLabelTemplate = async (name: string, width: number, height: number, layout: LabelElement[]) => {
    // const { data } = await $authHost.post('api/warehouse/label-templates', { name, width, height, layout });
    // return data;

    // --- ВРЕМЕННАЯ ИМИТАЦИЯ ---
    const stored = JSON.parse(localStorage.getItem("db_label_templates_mock") || "[]");
    
    const newTemplate: LabelTemplateModel = {
        id: Date.now(),
        name,
        width,
        height,
        layout,
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem("db_label_templates_mock", JSON.stringify([...stored, newTemplate]));
    return newTemplate;
};

// 3. Удалить шаблон
export const deleteLabelTemplate = async (id: number) => {
    // await $authHost.delete(`api/warehouse/label-templates/${id}`);
    
    // --- ВРЕМЕННАЯ ИМИТАЦИЯ ---
    const stored = JSON.parse(localStorage.getItem("db_label_templates_mock") || "[]");
    const filtered = stored.filter((t: LabelTemplateModel) => t.id !== id);
    localStorage.setItem("db_label_templates_mock", JSON.stringify(filtered));
};