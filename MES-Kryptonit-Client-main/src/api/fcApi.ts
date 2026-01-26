import { jwtDecode } from "jwt-decode"
import { $host, $authHost } from "./index"

//Запросы для pc эндпоинта
export const createPC = async (ip: string, pc_name: string, cabinet: string) => {
    const { data } = await $authHost.post('api/pcs', { ip, pc_name, cabinet })
    return data
}

// --- ИСПРАВЛЕНИЕ ЗДЕСЬ: используем $authHost вместо $host ---
export const fetchPC = async () => {
    const { data } = await $authHost.get('api/pcs') 
    return data
}

export const updatePC = async (id: number, ip: string, pc_name: string, cabinet: string) => {
    const { data } = await $authHost.put('api/pcs', { id, ip, pc_name, cabinet })
    return data
}
export const deletePC = async (id: number) => {
    const { data } = await $authHost.delete(`api/pcs/${id}`)
    return data
}


//Запросы для sessions эндпоинта
export const setSessionOnline = async (online: boolean, userId: number, PCId: number | null) => {
    const { data } = await $authHost.put('api/sessions', { online, userId, PCId })
    
    // Если PCId === null, значит это личный ноутбук
    if (PCId === null) {
        localStorage.setItem('pcID', 'PERSONAL');
    } else {
        localStorage.setItem('pcID', String(PCId));
    }
    
    localStorage.setItem('sessionID', String(data.id))
    return data
}

export const fetchSession = async () => {
    const { data } = await $authHost.get('api/sessions')
    return data
}


//запросы для defectCategoryFC эндпоинта
export const createCategoryDefect = async (title: string, description: string) => {
    const { data } = await $authHost.post('api/board-defects/fc', { title, description })
    return data
}
export const fetchCategoryDefect = async () => {
    const { data } = await $host.get('api/board-defects/fc',)
    return data
}
export const updateCategoryDefect = async (id: number, title: string, description: string) => {
    const { data } = await $authHost.put('api/board-defects/fc', { id, title, description })
    return data
}
export const deleteCategoryDefect = async (id: number) => {
    const { data } = await $authHost.delete(`api/board-defects/fc/${id}`)
    return data
}


//запросы для users эндпоинта

export const fetchUsers = async () => {
    const { data } = await $authHost.get('api/users',)
    return data
}

export const check = async () => {
    const { data } = await $authHost.get('api/user/auth')
    localStorage.setItem('token', data.token)

    return jwtDecode(data.token)
}


//запросы для fc эндпоинта
export const createFC = async (unique_device_id: string | null,
    firmware: boolean, sessionId: number, categoryDefectId: number) => {
    const { data } = await $authHost.post('api/fcs', { unique_device_id, firmware, sessionId, categoryDefectId })
    return data
}
export const fetchFC = async (unique_device_id: string | null, firmware: boolean | null, PCId: number | null, userId: number | null, categoryDefectId: number | null, stand_test: boolean | null, startDate: string | null, endDate:string | null, limit: number, page: number) => {
    const { data } = await $host.get('api/fcs', {
        params: {
            unique_device_id, firmware, PCId, userId, categoryDefectId, stand_test, startDate, endDate, limit, page
        }
    })
    return data
}
export const createManyDefectsFC = async (count: number,
    sessionId: number, categoryDefectId: number) => {
    const { data } = await $authHost.post('api/fcs/addManyDefectFC', {
        count, sessionId, categoryDefectId
    })
    return data
}
export const deleteFCbyID = async (id: number) => {
    const { data } = await $authHost.delete(`api/fcs/byDBid/${id}`)
    return data
}

export const deleteManyDefectsFC = async (count: number, categoryDefectId: number) => {
    const { data } = await $authHost.post('api/fcs/deleteManyDefectFC', {
        count, categoryDefectId
    })
    return data
}

export const changeStandTestResult = async (unique_device_id: string, sessionId: number, stand_test: boolean) => {
    const { data } = await $authHost.put('api/fcs/update-stand-test', {
        unique_device_id, sessionId, stand_test
    })
    return data
}
