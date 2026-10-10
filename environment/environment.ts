import { getDevServerHostIp } from "./getHostIp";
const devHostIp = getDevServerHostIp();

const environment = {
  // LOCAL (Auto-detected IP or fallback 192.168.8.102) --------------------
  API_BASE_URL: `http://${devHostIp}:3000/agro-api/collection-api/`,

  // DEV --------------------
  // API_BASE_URL: "https://collector-api.polygonagro.com/agro-api/collection-api/",

  // UAT --------------------
  // API_BASE_URL: "https://collector-mobile-app-api-uat.vercel.app/agro-api/collection-api/",

  // PROD --------------------
  // API_BASE_URL: "https://collector-api-prod.polygonagro.com/agro-api/collection-api/",
};

export { environment };
export default environment;
