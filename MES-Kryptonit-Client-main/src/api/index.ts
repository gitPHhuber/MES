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

export {
  $host,
  $authHost,
  $mqttHost,
  $product_components_Host,
  $firmware_control_host
};