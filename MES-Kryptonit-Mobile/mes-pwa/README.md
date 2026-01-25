# MES Kryptonit PWA

Progressive Web Application для системы управления производством MES Kryptonit.

## 🚀 Возможности

- **PWA** — установка на главный экран, работа офлайн
- **Keycloak SSO** — единая авторизация через корпоративный SSO
- **Локальный логин** — fallback авторизация по логину/паролю
- **Адаптивный дизайн** — работает на телефонах, планшетах, ПК
- **Тёмная тема** — современный дизайн для производственных условий

## 📱 Модули

| Модуль | Описание |
|--------|----------|
| Главная | Dashboard со статистикой и быстрыми действиями |
| Склад | Управление запасами, приход/расход |
| Производство | Сканирование, чеклисты, контроль качества |
| Задачи | Управление задачами |
| Рейтинги | Статистика сотрудников и команд |
| Профиль | Настройки пользователя, установка PWA |

## ⚙️ Конфигурация

Настройки находятся в `src/config/index.ts`:

```typescript
export const config = {
  // API бэкенда MES (через Vite прокси)
  API_URL: '/api',
  
  // Keycloak
  KEYCLOAK: {
    URL: 'http://10.11.0.16:8080',
    REALM: 'MES-Realm',
    CLIENT_ID: 'mes-web-client',
  },
  
  // Прямой URL API
  API_DIRECT_URL: 'http://10.11.0.16:5001',
}
```

### Feature flags

- `VITE_BERYLL_ENABLED=true` — включает маршруты Beryll в PWA (`/beryll`, `/beryll/server/:id`, `/beryll/batch/:id`).  
  Если флаг выключен, маршруты не регистрируются, и переходы будут обрабатываться SPA fallback.

## 🛠 Установка и запуск

### Требования
- Node.js 18+
- npm или yarn

### Установка зависимостей

```bash
cd mes-pwa
npm install
```

### Режим разработки

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000` и `http://<ваш-ip>:3000`.

### Production сборка

```bash
npm run build
```

Статические файлы появятся в папке `dist/`.

### Предпросмотр сборки

```bash
npm run preview
```

## 🌐 Развёртывание

### Вариант 1: Vite Preview (простой)

```bash
npm run preview -- --host
```

### Вариант 2: Nginx (production)

```nginx
server {
    listen 3000;
    server_name _;
    root /var/www/mes-pwa/dist;
    index index.html;

    # PWA assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker
    location /sw.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API Proxy
    location /api {
        proxy_pass http://10.11.0.16:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io Proxy
    location /socket.io {
        proxy_pass http://10.11.0.16:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Вариант 3: Docker

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 Keycloak настройка

1. Создайте клиент `mes-web-client` в Keycloak
2. Настройки клиента:
   - **Client Protocol:** openid-connect
   - **Access Type:** public
   - **Valid Redirect URIs:** `http://10.11.0.16:3000/*`
   - **Web Origins:** `http://10.11.0.16:3000`
   - **Standard Flow:** Enabled
   - **Direct Access Grants:** Disabled

3. Добавьте mappers для ролей в token

## 📂 Структура проекта

```
mes-pwa/
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── robots.txt
│   └── silent-check-sso.html
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios клиент
│   │   └── keycloak.ts        # Keycloak интеграция
│   ├── components/
│   │   ├── common/
│   │   │   └── Layout.tsx     # Главный layout
│   │   └── ui/
│   │       └── index.tsx      # UI компоненты
│   ├── config/
│   │   └── index.ts           # Конфигурация
│   ├── hooks/
│   │   └── useDebounce.ts     # Custom hooks
│   ├── pages/
│   │   ├── Auth/
│   │   ├── Home/
│   │   ├── Production/
│   │   ├── Profile/
│   │   ├── Rankings/
│   │   ├── Tasks/
│   │   └── Warehouse/
│   ├── store/
│   │   └── authStore.ts       # Zustand store
│   ├── types/
│   │   └── index.ts           # TypeScript типы
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 📲 Установка PWA

### Android
1. Откройте приложение в Chrome
2. Нажмите "Добавить на главный экран" или иконку установки в адресной строке

### iOS
1. Откройте приложение в Safari
2. Нажмите "Поделиться" → "На экран Домой"

### Desktop
1. Откройте в Chrome/Edge
2. Нажмите иконку установки в адресной строке

## 🔌 API Endpoints

Приложение ожидает следующие endpoints на бэкенде:

```
POST   /api/users/login           # Локальный логин
GET    /api/users/auth            # Проверка авторизации
GET    /api/warehouse/boxes       # Список коробок
GET    /api/warehouse/boxes/:id   # Детали коробки
POST   /api/warehouse/boxes/:id/movements  # Движение товара
GET    /api/products              # Список продуктов
POST   /api/products/scan         # Сканирование продукта
POST   /api/products/:id/complete-step     # Завершение этапа
GET    /api/production-steps/:id  # Детали этапа
GET    /api/tasks                 # Список задач
GET    /api/rankings/users        # Рейтинг пользователей
GET    /api/rankings/teams        # Рейтинг команд
GET    /api/rankings/my-stats     # Моя статистика
```

## 🐛 Troubleshooting

### Не работает Keycloak SSO
- Проверьте URL Keycloak в конфиге
- Убедитесь, что клиент `mes-web-client` настроен правильно
- Проверьте CORS настройки в Keycloak

### Ошибка CORS при API запросах
- Убедитесь, что Vite proxy настроен (dev режим)
- В production используйте Nginx proxy

### PWA не устанавливается
- Приложение должно работать по HTTPS (или localhost)
- Проверьте manifest.json в DevTools → Application

## 📄 Лицензия

MIT
