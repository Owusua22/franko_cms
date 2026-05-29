// src/Redux/Slice/AxiosInstance.js
import axios from "axios";

const LAMBDA_BASE_URL = import.meta.env.VITE_LAMBDA_BASE_URL;
const LAMBDA_HEADER_NAME = import.meta.env.VITE_LAMBDA_HEADER_NAME || "Identifier";
const LAMBDA_HEADER_VALUE = import.meta.env.VITE_LAMBDA_HEADER_VALUE || "Franko";

if (!LAMBDA_BASE_URL) {
  console.error("❌ VITE_LAMBDA_BASE_URL is not defined");
}

const safeGetFromStorage = (key) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    if (value === "[object Object]") {
      localStorage.removeItem(key);
      return null;
    }
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch {
    return null;
  }
};

const getAuthToken = () => {
  try {
    const user = safeGetFromStorage("user");
    if (user?.accessToken) return user.accessToken;
    return null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return false;
    
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 60;
    
    return (exp - bufferTime) <= now;
  } catch {
    return true;
  }
};

const handleUnauthorized = () => {
  console.warn("🔐 401 Unauthorized - Logging out user");
  
  localStorage.removeItem("user");
  localStorage.removeItem("customer");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("loginTime");
  localStorage.removeItem("lastActivity");
  
  // Prevent redirect loop - check if already on login page
  if (!window.location.pathname.includes("/admin/login")) {
    window.location.href = "/admin/login";
  }
};

const axiosInstance = axios.create({
  baseURL: LAMBDA_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    [LAMBDA_HEADER_NAME]: LAMBDA_HEADER_VALUE,
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    config.headers[LAMBDA_HEADER_NAME] = LAMBDA_HEADER_VALUE;

    if (!config.headers.Authorization) {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (
      config.data &&
      !config.headers["Content-Type"] &&
      typeof config.data === "object"
    ) {
      config.headers["Content-Type"] = "application/json";
    }

    config.params = {
      ...(config.params || {}),
    };

    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error("❌ Request setup failed:", error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;

    if (import.meta.env.DEV) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status || "Network error"}`);
    }

    // Handle 401 immediately
    if (status === 401) {
      handleUnauthorized();
      return Promise.reject(error);
    }

    if (error.code === "ECONNABORTED") {
      console.error("⏱ Request timed out");
    } else if (error.message === "Network Error") {
      console.error("📡 Network unreachable");
    } else if (status === 403) {
      console.warn("🚫 Forbidden access");
    } else if (status === 429) {
      console.warn("⚠️ Rate limited");
    } else if (status >= 500) {
      console.error("💥 Server error");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;