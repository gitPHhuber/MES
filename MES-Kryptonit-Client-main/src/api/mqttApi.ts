import { $mqttHost } from "./index";

// ===========================================
// FC
// ==========================================

export const mqttGetStatus = async () => {   //для FC
    try {
        const { data } = await $mqttHost.get(`status`);
        return data;
    } catch (error) {
        console.error("Ошибка при получении статуса:", error);
        return [];
    }
};

export const startTestFC = async (id: string) => {
    const { data } = await $mqttHost.get(`startTest/${id}`)
    return data
}

export const reloadTestFC = async (id: string) => {
    const { data } = await $mqttHost.get(`reload/${id}`)
    return data
}



// ===========================================
// ESC
// ==========================================

export const mqttGetStatusESC = async () => {
    try {
        const { data } = await $mqttHost.get(`statusESC`);
        return data;
    } catch (error) {
        console.error("Ошибка при получении статуса:", error);
        return [];
    }
};

export const startTestESC = async (id: string) => {
    const { data } = await $mqttHost.get(`startTestESC/${id}`)
    return data
}

export const reloadTestESC = async (id: string) => {
    const { data } = await $mqttHost.get(`reloadESC/${id}`)
    return data
}


