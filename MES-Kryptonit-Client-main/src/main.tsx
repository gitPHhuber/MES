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

// --- КОНФИГ KEYCLOAK ---
const oidcConfig = {
  authority: "http://keycloak.local/realms/MES-Realm", // Адрес Keycloak
  client_id: "mes-client",                             // Имя клиента в Keycloak
  redirect_uri: window.location.origin + "/",          // Куда вернуться после входа
  post_logout_redirect_uri: window.location.origin + "/", // Куда вернуться после выхода
  response_type: "code",                               // Стандартный Flow
  
  // чистит URL от мусора после редиректа
  onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname);
  }
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Провайдер авторизации оборачивает всё приложение */}
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