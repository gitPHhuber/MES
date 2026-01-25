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
    const { data } = await $authHost.get('api/warehouse/label-templates');
    return data as LabelTemplateModel[];
};

// 2. Создать шаблон
export const createLabelTemplate = async (name: string, width: number, height: number, layout: LabelElement[]) => {
    const { data } = await $authHost.post('api/warehouse/label-templates', { name, width, height, layout });
    return data as LabelTemplateModel;
};

// 3. Удалить шаблон
export const deleteLabelTemplate = async (id: number) => {
    await $authHost.delete(`api/warehouse/label-templates/${id}`);
};
