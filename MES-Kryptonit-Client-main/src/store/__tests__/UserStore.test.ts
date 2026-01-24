import { describe, it, expect, beforeEach } from 'vitest';
import UserStore from '../UserStore';

describe('UserStore RBAC', () => {
    let store: UserStore;

    beforeEach(() => {
        store = new UserStore();
    });

    it('SUPER_ADMIN должен иметь доступ ко всему', () => {
        store.setUser({
            id: 1, login: 'admin', name: 'Adm', surname: 'Adm', role: 'SUPER_ADMIN', abilities: [], exp:0, iat:0, img: null
        });
        
        expect(store.can('warehouse.view')).toBe(true);
        expect(store.can('nuclear.launch')).toBe(true);
    });

    it('Обычный пользователь должен иметь доступ только при наличии права', () => {
        store.setUser({
            id: 2, login: 'user', name: 'User', surname: 'U', role: 'USER', 
            abilities: ['warehouse.view'], // Есть право
            exp:0, iat:0, img: null
        });

        expect(store.can('warehouse.view')).toBe(true);
        expect(store.can('users.manage')).toBe(false); // Нет права
    });

    it('Гость (не залогинен) не должен иметь прав', () => {
        store.resetUser();
        expect(store.can('warehouse.view')).toBe(false);
    });
});