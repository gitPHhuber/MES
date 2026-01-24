import { $authHost, $host } from "./index"
import { userModel } from "src/types/UserModel"

export const login = async (login: string, password: string) => {
    const { data } = await $host.post("api/users/login", { login, password })
    localStorage.setItem("token", data.token)
    return data
}

export const registration = async (login: string, password: string, name: string, surname: string) => {
    const { data } = await $host.post("api/users/registration", { login, password, name, surname })
    localStorage.setItem("token", data.token)
    return data
}

export const check = async () => {
    const { data } = await $authHost.get("api/users/auth")
    if (data && data.id) {
        localStorage.setItem("userID", String(data.id))
    }
    return data as userModel
}

export const fetchCurrentUser = async (id: number) => {
    const { data } = await $authHost.get(`api/users/${id}`)
    return data
}

export const updateUser = async (id: number, password: string, name: string, surname: string) => {
    const { data } = await $authHost.put("api/users", { id, password, name, surname })
    return data
}

export const updateUserImg = async (idAndImg: FormData) => {
    const { data } = await $authHost.patch("api/users", idAndImg)
    return data
}

export const deleteUser = async (id: number) => {
    const { data } = await $authHost.delete(`api/users/${id}`)
    return data
}

export const getUsers = async () => {
    const { data } = await $authHost.get("api/users")
    return data
}