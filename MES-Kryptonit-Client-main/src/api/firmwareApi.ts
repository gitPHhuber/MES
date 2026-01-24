import axios from 'axios';

// Создаем экземпляр Axios
const firmwareAxios = axios.create({
  baseURL: "http://0.0.0.0:8000",
});
const miniBetaflyAxios = axios.create({
  baseURL: "http://localhost:3003",
});

const firmwareCoralB = axios.create({
  baseURL: "http://localhost:3333"
})





// для полетников
export const getSerialId = async (id: number, signal?: AbortSignal) => {
  const { data } = await firmwareAxios.get(`get-FC-ID/${id}`, { signal });
  return data;
};

export const uploadFont = async (id: number, signal?: AbortSignal) => {
  const { data } = await firmwareAxios.get(`upload-font/${id}`, { signal });
  return data;
};

export const startWork = async () => {
  await miniBetaflyAxios.get('startWork')
}
export const stopWork = async () => {
  await miniBetaflyAxios.get('stopWork')
}


// для 915
export const getMAC915 = async (id: number, signal?: AbortSignal) => {
  const { data } = await firmwareAxios.get(`get-mac-915/${id}`, { signal });
  return data;
};
export const eraseFlash915 = async (id: number, signal?: AbortSignal) => {
  const { data } = await firmwareAxios.get(`erase-flash-915/${id}`, { signal });
  return data;
};

export const uploadFlash915_002 = async (id: number, signal?: AbortSignal) => {
  const { data } = await firmwareAxios.get(`upload-flash-915-002/${id}`, { signal });
  return data;
};
export const uploadFlash915_019 = async (id: number, signal?: AbortSignal) => {
  const { data } = await firmwareAxios.get(`upload-flash-915-019/${id}`, { signal });
  return data;
};

export const transferToMode915 = async (signal?: AbortSignal) => {
  const { data } = await firmwareAxios.get(`transfer-to-mode-915`, { signal });
  return data;
};

//для 2.4

export const uploadFlash2_4 = async (id: number, signal?: AbortSignal) => {
  const { data } = await firmwareAxios.get(`upload-flash-2-4/${id}`, { signal });
  return data;
};


//для coralB

// src/api/firmwareApi.ts

export const sendCommand = async (command: string) => {
  const { data } = await firmwareCoralB.post(`/send-command`, {command});
  return data;
}
export const checkConnection = async () => {
  const { data } = await firmwareCoralB.get(`/data`);
  return data;
};
export const fetchData = async () => {
  const { data } = await firmwareCoralB.get(`/data`);
  return data;
};
export const clearLogs = async () => {
  const { data } = await firmwareCoralB.post(`/clear-logs`);
  return data;
};
