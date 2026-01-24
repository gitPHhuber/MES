import { makeAutoObservable } from "mobx"
import { userModel } from "src/types/UserModel"

export default class UserStore {
    private _isAuth: boolean = false
    private _user: userModel | null = null

    constructor() {
        makeAutoObservable(this)
    }

    setIsAuth(bool: boolean) {
        this._isAuth = bool
    }

    setUser(user: userModel) {
        this._user = user
    }

    resetUser() {
        this._user = null
        this._isAuth = false
    }

    /**
     * Основной метод проверки прав (RBAC)
     * @param permission - код права (slug), например "warehouse.view"
     */
    can(permission: string): boolean {
        if (!this._user) return false;
        
        // SUPER_ADMIN может всё
        if (this._user.role === 'SUPER_ADMIN') return true;

        // Проверяем наличие права в массиве
        return this._user.abilities?.includes(permission) || false;
    }

    /**
     * Проверка на конкретную роль (используется редко, лучше проверять права)
     */
    hasRole(role: string): boolean {
        return this._user?.role === role;
    }

    // Геттеры для обратной совместимости
    get user() {
        return this._user
    }
    
    get isAuth() {
        return this._isAuth
    }

    // Старый геттер isAdmin теперь проверяет право на доступ к админке
    get isAdmin() {
        return this.can('admin.access') || this.can('rbac.manage');
    }
}