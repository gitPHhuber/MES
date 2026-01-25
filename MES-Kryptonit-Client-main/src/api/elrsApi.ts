import { $host, $authHost } from "./index"

//запросы для defectCategory915 эндпоинта
export const createCategoryDefect915 = async (title: string, description: string) => {
    const { data } = await $authHost.post('api/board-defects/915', { title, description })
    return data
}
export const fetchCategoryDefect915 = async () => {
    const { data } = await $host.get('api/board-defects/915',)
    return data
}
export const updateCategoryDefect915 = async (id: number, title: string, description: string) => {
    const { data } = await $authHost.put('api/board-defects/915', { id, title, description })
    return data
}
export const deleteCategoryDefect915 = async (id: number) => {
    const { data } = await $authHost.delete(`api/board-defects/915/${id}`)
    return data
}


//запросы для defectCategory2-4 эндпоинта
export const createCategoryDefect24 = async (title: string, description: string) => {
    const { data } = await $authHost.post('api/board-defects/2-4', { title, description })
    return data
}
export const fetchCategoryDefect24 = async () => {
    const { data } = await $host.get('api/board-defects/2-4',)
    return data
}
export const updateCategoryDefect24 = async (id: number, title: string, description: string) => {
    const { data } = await $authHost.put('api/board-defects/2-4', { id, title, description })
    return data
}
export const deleteCategoryDefect24 = async (id: number) => {
    const { data } = await $authHost.delete(`api/board-defects/2-4/${id}`)
    return data
}

//запросы для ELRS915 эндпоинта
export const create915Board = async (MAC_address: string | null,
    firmware: boolean, sessionId: number, categoryDefect915Id: number, firmwareVersion: string | null) => {
    const { data } = await $authHost.post('api/ELRS915', { MAC_address, firmware, sessionId, categoryDefect915Id, firmwareVersion })
    return data
}

export const fetch915 = async (MAC_address: string | null, firmware: boolean | null, PCId: number | null, userId: number | null, categoryDefect915Id: number | null, firmwareVersion: string | null, date: string | null, limit: number, page: number) => {
    const { data } = await $host.get('api/ELRS915', {
        params: {
            MAC_address, firmware, PCId, userId, categoryDefect915Id, firmwareVersion, date, limit, page
        }
    })
    return data
}
export const createManyDefects915boards = async (count: number,
    sessionId: number, categoryDefect915Id: number) => {
    const { data } = await $authHost.post('api/ELRS915/addManyDefect915', {
        count, sessionId, categoryDefect915Id
    })
    return data
}
export const delete915byID = async (id: number) => {
    const { data } = await $authHost.delete(`api/ELRS915/byDBid/${id}`)
    return data
}

export const deleteManyDefects915boards = async (count: number, categoryDefect915Id: number) => {
    const { data } = await $authHost.post('api/ELRS915/deleteManyDefect915', {
        count, categoryDefect915Id
    })
    return data
}



//запросы для ELRS2-4 эндпоинта
export const create2_4Board = async (MAC_address: string | null,
    firmware: boolean, sessionId: number, categoryDefect24Id: number) => {
    const { data } = await $authHost.post('api/ELRS2-4', { MAC_address, firmware, sessionId, categoryDefect24Id })
    return data
}
export const fetch2_4 = async (MAC_address: string | null, firmware: boolean | null, PCId: number | null, userId: number | null, categoryDefect24Id: number | null, date: string | null, limit: number, page: number) => {
    const { data } = await $host.get('api/ELRS2-4', {
        params: {
            MAC_address, firmware, PCId, userId, categoryDefect24Id, date, limit, page
        }
    })
    return data
}
export const createManyDefects2_4boards = async (count: number,
    sessionId: number, categoryDefect24Id: number) => {
    const { data } = await $authHost.post('api/ELRS2-4/addManyDefect2-4', {
        count, sessionId, categoryDefect24Id
    })
    return data
}
export const delete2_4byID = async (id: number) => {
    const { data } = await $authHost.delete(`api/ELRS2-4/byDBid/${id}`)
    return data
}

export const deleteManyDefects2_4boards = async (count: number, categoryDefect24Id: number) => {
    const { data } = await $authHost.post('api/ELRS2-4/deleteManyDefect2-4', {
        count, categoryDefect24Id
    })
    return data
}
