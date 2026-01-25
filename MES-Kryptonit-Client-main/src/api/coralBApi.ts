import { $host, $authHost } from "./index"

//запросы для board-defects/coral-b эндпоинта
export const createCategoryDefectCoral_B = async (title: string, description: string) => {
    const { data } = await $authHost.post('api/board-defects/coral-b', { title, description })
    return data
}
export const fetchCategoryDefectCoral_B = async () => {
    const { data } = await $host.get('api/board-defects/coral-b',)
    return data
}
export const updateCategoryDefectCoral_B = async (id: number, title: string, description: string) => {
    const { data } = await $authHost.put('api/board-defects/coral-b', { id, title, description })
    return data
}
export const deleteCategoryDefectCoral_B = async (id: number) => {
    const { data } = await $authHost.delete(`api/board-defects/coral-b/${id}`)
    return data
}


//запросы для Coral_B эндпоинта
export const createCoral_B_Board = async (serial: string | null,
    firmware: boolean, SAW_filter: boolean, firmwareVersion: string | null, sessionId: number, categoryDefectCoralBId: number) => {
    const { data } = await $authHost.post('api/Coral-B', { serial, firmware, SAW_filter, firmwareVersion, sessionId, categoryDefectCoralBId })
    return data
}
export const fetchCoral_B = async (serial: string | null, firmware: boolean | null, SAW_filter: boolean | null, firmwareVersion: string | null, PCId: number | null, userId: number | null, categoryDefectCoralBId: number | null, date: string | null, limit: number, page: number) => {
    const { data } = await $host.get('api/Coral-B', {
        params: {
            serial, firmware, SAW_filter, firmwareVersion, PCId, userId, categoryDefectCoralBId, date, limit, page
        }
    })
    return data
}
export const createManydefectsCoral_B_boards = async (count: number, SAW_filter: boolean, sessionId: number, categoryDefectCoralBId: number) => {
    const { data } = await $authHost.post('api/Coral_B/addManyDefectCoralB', {
        count, SAW_filter, sessionId, categoryDefectCoralBId
    })
    return data
}
export const deleteCoral_BbyID = async (id: number) => {
    const { data } = await $authHost.delete(`api/Coral-B/byDBid/${id}`)
    return data
}

export const deleteManydefects_Coral_B_boards = async (count: number, SAW_filter: boolean, categoryDefectCoralBId: number) => {
    const { data } = await $authHost.post('api/Coral-B/deleteManyDefectCoralB', {
        count, SAW_filter, categoryDefectCoralBId
    })
    return data
}
