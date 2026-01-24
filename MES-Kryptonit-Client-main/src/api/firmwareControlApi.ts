import { $firmware_control_host } from "."

export const startCoralBFirm = async () => {
    const { data } = await $firmware_control_host.get('api/on-app',)
    return data
}
export const stopCoralBFirm = async () => {
    const { data } = await $firmware_control_host.get('api/off-app',)
    return data
}