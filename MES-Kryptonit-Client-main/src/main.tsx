import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import UserStore from "./store/UserStore.ts";
import FlightControllerStore from "./store/FCStore.ts";
import FirmwareFCStore from "./store/FirmwareFC.ts";
import Firmware915Store from "./store/Firmware915.ts";
import ELRSStore from "./store/ELRS_915_and_2_4_store.ts";
import ProductStore from "./store/ProductStore.ts";
import FirmwareCoralBStore from "./store/FirmwareCoralB.ts";
import CoralBStore from "./store/Coral_B_store.ts";
import StructureStore from "./store/StructureStore.ts";

// Интерфейс для глобального контекста MobX
interface IContext {
  user: UserStore;
  flightController: FlightControllerStore;
  elrsStore: ELRSStore;
  coralBStore: CoralBStore;
  firmwareFC: FirmwareFCStore;
  firmware915: Firmware915Store;
  firmwareCoralB: FirmwareCoralBStore;
  product_component: ProductStore;
  structureStore: StructureStore;
}

export const Context = React.createContext<IContext | null>(null);

// ============================================
// СОХРАНЕНИЕ МАРШРУТА ПРИ ПЕРЕЗАГРУЗКЕ
// ============================================

// Ключ для сохранения пути в sessionStorage
const REDIRECT_PATH_KEY = "mes_redirect_path";

/**
 * Сохраняем текущий путь перед редиректом на Keycloak
 * Вызывается при загрузке страницы (перед возможным OIDC редиректом)
 */
const saveCurrentPath = () => {
  const currentPath = window.location.pathname + window.location.search;
  
  // Не сохраняем корневой путь, путь логина или если есть OIDC параметры (code, state)
  const hasOidcParams = window.location.search.includes('code=') || 
                        window.location.search.includes('state=');
  
  if (currentPath !== "/" && 
      !currentPath.includes("/login") && 
      !hasOidcParams) {
    sessionStorage.setItem(REDIRECT_PATH_KEY, currentPath);
  }
};

/**
 * Получаем сохранённый путь после аутентификации
 */
export const getSavedPath = (): string | null => {
  return sessionStorage.getItem(REDIRECT_PATH_KEY);
};

/**
 * Очищаем сохранённый путь после использования
 */
export const clearSavedPath = () => {
  sessionStorage.removeItem(REDIRECT_PATH_KEY);
};

// Сохраняем путь при загрузке страницы (ДО возможного редиректа на Keycloak)
saveCurrentPath();

// ============================================
// КОНФИГ KEYCLOAK
// ============================================

const oidcConfig = {
  authority: "http://keycloak.local/realms/MES-Realm",
  client_id: "mes-client",
  redirect_uri: window.location.origin + "/",
  post_logout_redirect_uri: window.location.origin + "/",
  response_type: "code",
  
  /**
   * Callback после успешного логина через Keycloak
   * ИСПРАВЛЕНО: Только очищаем URL от OIDC параметров, НЕ очищаем savedPath
   * Очистка savedPath происходит в App.tsx после использования
   */
  onSigninCallback: () => {
    // Получаем сохранённый путь (куда пользователь хотел попасть)
    const savedPath = getSavedPath();
    
    // Очищаем URL от OIDC параметров (code, state, session_state)
    // Если есть сохранённый путь - используем его, иначе оставляем корень
    const cleanUrl = savedPath || "/";
    
    window.history.replaceState({}, document.title, cleanUrl);
    
    // НЕ очищаем savedPath здесь! Очистка происходит в App.tsx
    // Это позволяет App.tsx прочитать путь и сделать navigate()
  }
};

// ============================================
// РЕНДЕР ПРИЛОЖЕНИЯ
// ============================================

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <Context.Provider
          value={{
            user: new UserStore(),
            flightController: new FlightControllerStore(),
            elrsStore: new ELRSStore(),
            coralBStore: new CoralBStore(),
            firmwareFC: new FirmwareFCStore(),
            firmware915: new Firmware915Store(),
            firmwareCoralB: new FirmwareCoralBStore(),
            product_component: new ProductStore(),
            structureStore: new StructureStore(),
          }}
        >
          <App />
        </Context.Provider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);