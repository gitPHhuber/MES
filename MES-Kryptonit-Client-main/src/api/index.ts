import axios from 'axios';

// Создаем экземпляры Axios
const $host = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const $authHost = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const $mqttHost = axios.create({
  baseURL: import.meta.env.VITE_MQTT_API_URL,
});

const $product_components_Host = axios.create({
  baseURL: import.meta.env.VITE_PRODUCT_COMPONENT_API_URL,
});

const $firmware_control_host = axios.create({
  baseURL: import.meta.env.VITE_FIRMWARE_CONTROL,
});

const responseInterceptor = (response: any) => response;

const responseErrorInterceptor = (error: any) => {
  const requestId =
    error?.response?.headers?.["x-request-id"] ??
    error?.response?.headers?.["X-Request-Id"] ??
    null;

  error.requestId = requestId;
  error.userMessage = `Ошибка сервера. RequestId: ${
    requestId ?? "неизвестен"
  }`;

  if (import.meta.env.DEV) {
    const { config, response } = error;
    console.error("API error", {
      url: config?.url,
      method: config?.method,
      status: response?.status,
      requestId,
      data: response?.data,
    });
  }

  return Promise.reject(error);
};

// Интерцептор: добавляем токен только если он валидный
const authInterceptor = (config: any) => {
  const token = localStorage.getItem('token');
  // Проверка на null, undefined и строку "null" (частая ошибка при сохранении)
  if (token && token !== "undefined" && token !== "null") {
    config.headers.authorization = `Bearer ${token}`;
  }
  return config;
};

$authHost.interceptors.request.use(authInterceptor);
$product_components_Host.interceptors.request.use(authInterceptor); // Если там тоже нужна защита
$host.interceptors.response.use(responseInterceptor, responseErrorInterceptor);
$authHost.interceptors.response.use(
  responseInterceptor,
  responseErrorInterceptor
);
$mqttHost.interceptors.response.use(responseInterceptor, responseErrorInterceptor);
$product_components_Host.interceptors.response.use(
  responseInterceptor,
  responseErrorInterceptor
);
$firmware_control_host.interceptors.response.use(
  responseInterceptor,
  responseErrorInterceptor
);

export {
  $host,
  $authHost,
  $mqttHost,
  $product_components_Host,
  $firmware_control_host
};
