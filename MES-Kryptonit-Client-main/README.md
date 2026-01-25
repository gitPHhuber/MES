# MES-Kryptonit-Client-main

## Единый входной домен

В production используем единый домен фронтенда, а API и socket.io доступны через
пути `/api` и `/socket.io` на том же домене (ingress/nginx проксирует к backend
и socket-сервису). Например:

- `https://mes.example.local` — фронтенд
- `https://mes.example.local/api` — backend
- `https://mes.example.local/socket.io` — socket.io

## Пример `.env`

```dotenv
VITE_API_URL=/api
VITE_MQTT_API_URL=/socket.io
VITE_PRODUCT_COMPONENT_API_URL=/api
VITE_FIRMWARE_CONTROL=/api
VITE_FIRMWARE_API_URL=/firmware-api
VITE_MINI_BETAFLY_API_URL=/mini-betafly
VITE_CORALB_API_URL=/coral-b
VITE_BETAFLY_WS_URL=ws://localhost:8090
VITE_NODE_RED_URL=http://localhost:1880
```

## Dev proxy (Vite)

Для локальной разработки можно проксировать сервисы через Vite, оставляя
фронтенд с относительными путями (`/firmware-api`, `/mini-betafly`, `/coral-b`).
Переопределяется через `.env.*`:

```dotenv
VITE_FIRMWARE_API_TARGET=http://0.0.0.0:8000
VITE_MINI_BETAFLY_API_TARGET=http://localhost:3003
VITE_CORALB_API_TARGET=http://localhost:3333
```

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
