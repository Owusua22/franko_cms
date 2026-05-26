// src/Redux/Slice/customerSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance"; // ✅ Lambda axios instance

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const CUSTOMER_KEY = "customer";

// ─────────────────────────────────────────────
// Safe localStorage helpers that work with encrypted localStorage
// Note: The localStorage is already monkey-patched in App.jsx
// ─────────────────────────────────────────────

const safeGetFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    
    // The monkey-patched localStorage already returns parsed objects or null
    if (!data) return null;
    
    // If it's already an object (from monkey patch), return it
    if (typeof data === "object" && data !== null) {
      return data;
    }
    
    // If it's a string that looks like corrupted object notation
    if (typeof data === "string" && data === "[object Object]") {
      console.warn(`Invalid object string found for key "${key}". Cleaning up.`);
      localStorage.removeItem(key);
      return null;
    }
    
    // If it's a valid JSON string, try parsing it
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch (parseError) {
        console.warn(`Failed to parse JSON for key "${key}":`, parseError);
        return null;
      }
    }
    
    return data;
  } catch (e) {
    console.warn(`Failed to get ${key} from localStorage:`, e);
    return null;
  }
};

const safeSetToStorage = (key, value) => {
  try {
    if (!value) {
      localStorage.removeItem(key);
    } else {
      // The monkey-patched localStorage will handle encryption and stringification
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.error(`Failed to persist ${key}:`, e);
  }
};

// ─────────────────────────────────────────────
// Customer-specific localStorage helpers
// ─────────────────────────────────────────────
const loadFromStorage = () => {
  try {
    const data = safeGetFromStorage(CUSTOMER_KEY);
    
    if (!data) return null;
    
    // Validate the customer object structure
    if (typeof data === "object" && data !== null) {
      // Basic validation to ensure it's a valid customer object
      if (data.contactNumber || data.customerAccountNumber || data.accessToken) {
        return data;
      }
    }
    
    return null;
  } catch (e) {
    console.warn("Failed to load customer from storage:", e);
    return null;
  }
};

const saveToStorage = (customer) => {
  try {
    if (!customer) {
      safeSetToStorage(CUSTOMER_KEY, null);
    } else {
      // Ensure we're saving a valid customer object
      const customerToSave = {
        ...customer,
        lastUpdated: Date.now(), // Add timestamp for tracking
      };
      safeSetToStorage(CUSTOMER_KEY, customerToSave);
    }
  } catch (e) {
    console.error("Failed to persist customer:", e);
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(CUSTOMER_KEY);
  } catch (e) {
    console.error("Failed to clear customer storage:", e);
  }
};

// ─────────────────────────────────────────────
// Safe JSON parser
// ─────────────────────────────────────────────
const safeParseJSON = (raw) => {
  if (typeof raw === "object" && raw !== null) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────
// AXIOS HELPERS (via Lambda)
// ─────────────────────────────────────────────

/**
 * Raw axios call to backend through Lambda
 * - endpoint: real backend path (e.g. "/Users/Customer-Post")
 * - method: GET/POST, etc.
 * - data: body (for POST/PUT)
 * - extraParams: query params (besides endpoint)
 * - headers: additional headers
 */
const callBackend = async ({
  endpoint,
  method = "GET",
  data,
  extraParams = {},
  headers = {},
}) => {
  const config = {
    method,
    url: "/", // Lambda root
    params: {
      endpoint,
      ...extraParams,
    },
    headers,
  };

  if (data) {
    config.data = data;
  }

  const res = await axiosInstance(config);
  return res;
};

/**
 * Helper to attach Authorization header from:
 *  - providedToken (explicit)
 *  - or stored customer in localStorage
 */
const buildAuthHeaders = (providedToken = null) => {
  const stored = loadFromStorage();
  const accessToken = providedToken || stored?.accessToken;
  const headers = { "Content-Type": "application/json" };
  if (accessToken && typeof accessToken === 'string' && accessToken.trim() !== '') {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

// ─────────────────────────────────────────────
// Token refresh (via Lambda -> /Users/CustomerRefreshToken)
// ─────────────────────────────────────────────
const refreshCustomerToken = async (refreshToken) => {
  const headers = { "Content-Type": "application/json" };

  const res = await callBackend({
    endpoint: "/Users/CustomerRefreshToken",
    method: "POST",
    data: { refreshToken },
    headers,
  });

  const data = safeParseJSON(res.data);

  if (!res.status || res.status < 200 || res.status >= 300) {
    throw new Error(data?.response?.responseMessage || "Token refresh failed");
  }

  // Original logic: data.response.responseCode === "1"
  const code = data?.response?.responseCode;
  if (code !== "1") {
    throw new Error(data?.response?.responseMessage || "Token refresh failed");
  }

  return data;
};

// ─────────────────────────────────────────────
// Silent token refresh - ENHANCED
// ─────────────────────────────────────────────
let refreshPromise = null; // Prevent multiple simultaneous refresh attempts

const silentTokenRefresh = async (dispatch) => {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  try {
    const stored = loadFromStorage();
    const refreshToken = stored?.refreshToken;
    
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      console.warn('No valid refresh token found for customer');
      dispatch(logoutCustomer());
      return null;
    }

    refreshPromise = refreshCustomerToken(refreshToken);
    const refreshed = await refreshPromise;

    const newTokens = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    };

    // Update stored customer with new tokens
    const updatedCustomer = { 
      ...stored, 
      ...newTokens,
      lastTokenRefresh: Date.now()
    };
    saveToStorage(updatedCustomer);
    
    // Update Redux state silently
    dispatch(updateToken(newTokens));
    
    refreshPromise = null;
    return newTokens.accessToken;
  } catch (error) {
    refreshPromise = null;
    console.error('Silent token refresh failed:', error);
    dispatch(logoutCustomer());
    return null;
  }
};

// ─────────────────────────────────────────────
// Request with auto-refresh & auto-logout - ENHANCED
// ─────────────────────────────────────────────
const requestWithAutoRefresh = async ({
  endpoint,
  method = "GET",
  data,
  extraParams = {},
  providedToken = null,
  dispatch = null,
}) => {
  const stored = loadFromStorage();

  // First attempt with current or provided token
  let headers = buildAuthHeaders(providedToken);

  let res;
  try {
    res = await callBackend({
      endpoint,
      method,
      data,
      extraParams,
      headers,
    });
  } catch (err) {
    // If backend returns 401 through axios
    if (err.response?.status !== 401) {
      throw err;
    }
    res = err.response; // treat as 401 response
  }

  if (res.status !== 401) {
    return res;
  }

  // 401: try silent refresh if dispatch is available
  if (dispatch) {
    const newAccessToken = await silentTokenRefresh(dispatch);
    if (newAccessToken) {
      // Retry original request with new access token
      headers = buildAuthHeaders(newAccessToken);

      const retryRes = await callBackend({
        endpoint,
        method,
        data,
        extraParams,
        headers,
      });

      return retryRes;
    }
  }

  // Fallback to old refresh logic
  const refreshToken = stored?.refreshToken;
  if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim() === '') {
    clearStorage();
    throw new Error("SESSION_EXPIRED");
  }

  try {
    const refreshed = await refreshCustomerToken(refreshToken);

    const newTokens = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    };

    // Merge and persist updated tokens
    const updatedCustomer = { 
      ...stored, 
      ...newTokens,
      lastTokenRefresh: Date.now()
    };
    saveToStorage(updatedCustomer);

    // Retry original request with new access token
    headers = buildAuthHeaders(newTokens.accessToken);

    const retryRes = await callBackend({
      endpoint,
      method,
      data,
      extraParams,
      headers,
    });

    return retryRes;
  } catch (error) {
    clearStorage();
    throw new Error("SESSION_EXPIRED");
  }
};

// ─────────────────────────────────────────────
// Customer validation helper
// ─────────────────────────────────────────────
const validateCustomerData = (customerData) => {
  if (!customerData || typeof customerData !== 'object') {
    return false;
  }
  
  // Check for required fields
  const requiredFields = ['contactNumber'];
  return requiredFields.every(field => 
    customerData[field] && 
    typeof customerData[field] === 'string' && 
    customerData[field].trim() !== ''
  );
};

// ─────────────────────────────────────────────
// Async Thunks (via Lambda) - ENHANCED
// ─────────────────────────────────────────────

// ── Create Customer ──────────────────────────
export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      // Validate input data
      if (!validateCustomerData(customerData)) {
        return rejectWithValue({
          message: "Invalid customer data provided.",
          responseCode: "0",
        });
      }

      const res = await callBackend({
        endpoint: "/Users/Customer-Post",
        method: "POST",
        data: customerData,
        headers: { "Content-Type": "application/json" },
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.ResponseMessage || "Registration failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Registration failed.",
        responseCode: "0",
      });
    }
  }
);

// ── Fetch All Customers ──────────────────────
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const res = await requestWithAutoRefresh({
        endpoint: "/Users/Customer-Get",
        method: "GET",
        dispatch,
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.ResponseMessage || "Failed to fetch customers.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      // Ensure we return an array
      return Array.isArray(data) ? data : [data].filter(Boolean);
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        return rejectWithValue({
          message: "Session expired. Please login again.",
          responseCode: "401",
        });
      }
      return rejectWithValue({
        message: error.message || "Failed to fetch customers.",
        responseCode: "0",
      });
    }
  }
);

// ── Get Customer By Contact Number ──────────
export const getCustomerById = createAsyncThunk(
  "customers/getCustomerById",
  async ({ contactNumber, accessToken = null }, { rejectWithValue, dispatch }) => {
    try {
      if (!contactNumber || typeof contactNumber !== 'string' || contactNumber.trim() === '') {
        return rejectWithValue({
          message: "Valid contact number is required.",
          responseCode: "0",
        });
      }

      const res = await requestWithAutoRefresh({
        endpoint: "/Users/GetCustomerById",
        method: "GET",
        extraParams: { contactNumber },
        providedToken: accessToken,
        dispatch,
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.ResponseMessage || "Failed to fetch customer.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      const customer = Array.isArray(data) ? data[0] : data;

      if (!customer || !validateCustomerData(customer)) {
        return rejectWithValue({
          message: "Customer not found or invalid customer data.",
          responseCode: "0",
        });
      }

      return customer;
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        return rejectWithValue({
          message: "Session expired. Please login again.",
          responseCode: "401",
        });
      }
      return rejectWithValue({
        message: error.message || "Failed to fetch customer.",
        responseCode: "0",
      });
    }
  }
);

// ── Login Customer ───────────────────────────
export const loginCustomer = createAsyncThunk(
  "customers/loginCustomer",
  async ({ contactNumber, password }, { dispatch, rejectWithValue }) => {
    try {
      if (!contactNumber || !password || 
          typeof contactNumber !== 'string' || typeof password !== 'string' ||
          contactNumber.trim() === '' || password.trim() === '') {
        return rejectWithValue({
          message: "Contact number and password are required.",
          responseCode: "0",
          isAccountNotFound: false,
        });
      }

      const res = await callBackend({
        endpoint: "/Users/CustomerLogin",
        method: "POST",
        data: { contactNumber, password, FullName: "N/A" },
        headers: { "Content-Type": "application/json" },
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.response?.responseMessage || "Login failed.",
          responseCode: data?.response?.responseCode || String(res.status),
          isAccountNotFound: false,
        });
      }

      const responseCode = data?.response?.responseCode;
      const responseMessage = data?.response?.responseMessage;
      const loginStatus = data?.status;

      if (!data || responseCode !== "1") {
        const msg = responseMessage || "Access Denied";
        const code = responseCode ?? "0";

        const isAccountNotFound =
          code === "0" ||
          msg.toLowerCase().includes("access denied") ||
          msg.toLowerCase().includes("not found") ||
          msg.toLowerCase().includes("invalid");

        return rejectWithValue({
          message: msg,
          responseCode: code,
          isAccountNotFound,
        });
      }

      // If loginStatus is false, return tokens + flag for password change
      if (loginStatus === false) {
        const loginResult = {
          contactNumber,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          requiresPasswordChange: true,
          loginStatus: false,
          loginTime: Date.now(),
        };
        // do NOT persist yet
        return loginResult;
      }

      // Status is true: temporarily store tokens to use in getCustomerById
      const tempCustomer = {
        contactNumber,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        loginTime: Date.now(),
      };
      saveToStorage(tempCustomer);

      // Fetch profile
      try {
        const profile = await dispatch(
          getCustomerById({
            contactNumber,
            accessToken: data.accessToken,
          })
        ).unwrap();

        const merged = {
          ...profile,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          contactNumber,
          loginStatus: true,
          isAuthenticated: true,
          loginTime: Date.now(),
        };

        saveToStorage(merged);
        return merged;
      } catch (profileError) {
        console.warn("Failed to fetch customer profile, using basic data:", profileError);
        
        const basicCustomer = {
          contactNumber,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          loginStatus: true,
          isAuthenticated: true,
          loginTime: Date.now(),
        };

        saveToStorage(basicCustomer);
        return basicCustomer;
      }
    } catch (error) {
      if (error?.responseCode) return rejectWithValue(error);
      return rejectWithValue({
        message: error.message || "Login failed.",
        responseCode: "0",
        isAccountNotFound: false,
      });
    }
  }
);

// ── Update Password ──────────────────────────
export const updateCustomerPassword = createAsyncThunk(
  "customers/updateCustomerPassword",
  async ({ contactNumber, oldPassword, newPassword }, { rejectWithValue, dispatch }) => {
    try {
      if (!contactNumber || !oldPassword || !newPassword ||
          typeof contactNumber !== 'string' || 
          typeof oldPassword !== 'string' || 
          typeof newPassword !== 'string' ||
          contactNumber.trim() === '' || 
          oldPassword.trim() === '' || 
          newPassword.trim() === '') {
        return rejectWithValue({
          message: "All password fields are required.",
          responseCode: "0",
        });
      }

      const res = await requestWithAutoRefresh({
        endpoint: "/Users/UpdateCustomerPassword",
        method: "POST",
        data: { contactNumber, oldPassword, newPassword },
        dispatch,
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300 || data?.ResponseCode !== "1") {
        return rejectWithValue({
          message: data?.ResponseMessage || "Password update failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return data;
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        return rejectWithValue({
          message: "Session expired. Please login again.",
          responseCode: "401",
        });
      }
      return rejectWithValue({
        message: error.message || "Password update failed.",
        responseCode: "0",
      });
    }
  }
);

// ── Update Account Status ────────────────────
export const updateAccountStatus = createAsyncThunk(
  "customers/updateAccountStatus",
  async (_, { getState, rejectWithValue, dispatch }) => {
    try {
      const customer = getState().customer.currentCustomer;

      if (!customer?.customerAccountNumber) {
        return rejectWithValue({
          message: "No customer account found.",
          responseCode: "0",
        });
      }

      const res = await requestWithAutoRefresh({
        endpoint: "/Users/Customer-Status",
        method: "POST",
        data: {
          accountNumber: customer.customerAccountNumber,
          accountStatus: "0",
        },
        dispatch,
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.ResponseMessage || "Status update failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      clearStorage();
      return data;
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        return rejectWithValue({
          message: "Session expired. Please login again.",
          responseCode: "401",
        });
      }
      return rejectWithValue({
        message: error.message || "Status update failed.",
        responseCode: "0",
      });
    }
  }
);

// ── Forgot Password ──────────────────────────
export const forgotPassword = createAsyncThunk(
  "customers/forgotPassword",
  async ({ contactNumber, email }, { rejectWithValue }) => {
    try {
      if (!contactNumber || !email ||
          typeof contactNumber !== 'string' || typeof email !== 'string' ||
          contactNumber.trim() === '' || email.trim() === '') {
        return rejectWithValue({
          message: "Contact number and email are required.",
          responseCode: "0",
        });
      }

      const res = await callBackend({
        endpoint: "/Users/ForgotPassword",
        method: "POST",
        data: { contactNumber, email },
        headers: { "Content-Type": "application/json" },
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300 || data?.ResponseCode !== "1") {
        return rejectWithValue({
          message: data?.ResponseMessage || "Password reset request failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Password reset request failed.",
        responseCode: "0",
      });
    }
  }
);

// ── Reset Password ───────────────────────────
export const resetPassword = createAsyncThunk(
  "customers/resetPassword",
  async ({ contactNumber, token, newPassword }, { rejectWithValue }) => {
    try {
      if (!contactNumber || !token || !newPassword ||
          typeof contactNumber !== 'string' || 
          typeof token !== 'string' || 
          typeof newPassword !== 'string' ||
          contactNumber.trim() === '' || 
          token.trim() === '' || 
          newPassword.trim() === '') {
        return rejectWithValue({
          message: "All reset password fields are required.",
          responseCode: "0",
        });
      }

      const res = await callBackend({
        endpoint: "/Users/ResetPassword",
        method: "POST",
        data: { contactNumber, token, newPassword },
        headers: { "Content-Type": "application/json" },
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300 || data?.ResponseCode !== "1") {
        return rejectWithValue({
          message: data?.ResponseMessage || "Password reset failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Password reset failed.",
        responseCode: "0",
      });
    }
  }
);

// ─────────────────────────────────────────────
// Initial State - Enhanced with proper validation
// ─────────────────────────────────────────────
const hydrated = loadFromStorage();

const initialState = {
  currentCustomer: hydrated,
  currentCustomerDetails: hydrated,
  customerList: [],
  loading: false,
  error: null,
  isAuthenticated: !!(hydrated?.accessToken && 
                      typeof hydrated.accessToken === 'string' && 
                      hydrated.accessToken.trim() !== ''),
};

// ─────────────────────────────────────────────
// Slice - Enhanced
// ─────────────────────────────────────────────
const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    logoutCustomer: (state) => {
      state.currentCustomer = null;
      state.currentCustomerDetails = null;
      state.isAuthenticated = false;
      state.error = null;
      clearStorage();
    },
    setCurrentCustomer: (state, action) => {
      const customer = action.payload;
      if (customer && validateCustomerData(customer)) {
        state.currentCustomer = customer;
        state.currentCustomerDetails = customer;
        state.isAuthenticated = !!(customer.accessToken && 
                                  typeof customer.accessToken === 'string' && 
                                  customer.accessToken.trim() !== '');
        saveToStorage(customer);
      } else {
        state.currentCustomer = null;
        state.currentCustomerDetails = null;
        state.isAuthenticated = false;
        clearStorage();
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    updateToken: (state, action) => {
      if (state.currentCustomer && action.payload?.accessToken && action.payload?.refreshToken) {
        const updatedCustomer = {
          ...state.currentCustomer,
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          lastTokenRefresh: Date.now(),
        };
        
        state.currentCustomer = updatedCustomer;
        state.currentCustomerDetails = updatedCustomer;
        state.isAuthenticated = true;
        saveToStorage(updatedCustomer);
      }
    },
    syncWithStorage: (state) => {
      // Utility action to sync Redux state with localStorage
      const stored = loadFromStorage();
      if (stored && validateCustomerData(stored)) {
        state.currentCustomer = stored;
        state.currentCustomerDetails = stored;
        state.isAuthenticated = !!(stored.accessToken && 
                                  typeof stored.accessToken === 'string' && 
                                  stored.accessToken.trim() !== '');
      } else {
        state.currentCustomer = null;
        state.currentCustomerDetails = null;
        state.isAuthenticated = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ── createCustomer ──
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.ResponseCode === "1") {
          const customer = { ...action.meta.arg, ...action.payload, createdAt: Date.now() };
          if (validateCustomerData(customer)) {
            state.currentCustomer = customer;
            state.currentCustomerDetails = customer;
            state.isAuthenticated = !!(customer?.accessToken && 
                                      typeof customer.accessToken === 'string' && 
                                      customer.accessToken.trim() !== '');
            saveToStorage(customer);
          }
        }
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Registration failed.";
      })

      // ── fetchCustomers ──
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customerList = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch customers.";
        if (action.payload?.responseCode === "401") {
          state.currentCustomer = null;
          state.currentCustomerDetails = null;
          state.isAuthenticated = false;
          clearStorage();
        }
      })

      // ── getCustomerById ──
      .addCase(getCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        if (validateCustomerData(action.payload)) {
          state.currentCustomerDetails = action.payload;
        }
      })
      .addCase(getCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch customer details.";
        if (action.payload?.responseCode === "401") {
          state.currentCustomer = null;
          state.currentCustomerDetails = null;
          state.isAuthenticated = false;
          clearStorage();
        }
      })

      // ── loginCustomer ──
      .addCase(loginCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginCustomer.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload.requiresPasswordChange && validateCustomerData(action.payload)) {
          state.currentCustomer = action.payload;
          state.currentCustomerDetails = action.payload;
          state.isAuthenticated = true;
        }
      })
      .addCase(loginCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login failed.";
        state.isAuthenticated = false;
        clearStorage();
      })

      // ── updateCustomerPassword ──
      .addCase(updateCustomerPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomerPassword.fulfilled, (state) => {
        state.loading = false;
        // Update last password change timestamp
        if (state.currentCustomer) {
          const updatedCustomer = {
            ...state.currentCustomer,
            lastPasswordChange: Date.now(),
          };
          state.currentCustomer = updatedCustomer;
          saveToStorage(updatedCustomer);
        }
      })
      .addCase(updateCustomerPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Password update failed.";
        if (action.payload?.responseCode === "401") {
          state.currentCustomer = null;
          state.currentCustomerDetails = null;
          state.isAuthenticated = false;
          clearStorage();
        }
      })

      // ── updateAccountStatus ──
      .addCase(updateAccountStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccountStatus.fulfilled, (state) => {
        state.loading = false;
        state.currentCustomer = null;
        state.currentCustomerDetails = null;
        state.isAuthenticated = false;
      })
      .addCase(updateAccountStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Status update failed.";
      })

      // ── forgotPassword ──
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Password reset request failed.";
      })

      // ── resetPassword ──
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Password reset failed.";
      });
  },
});

export const {
  logoutCustomer,
  setCurrentCustomer,
  clearError,
  updateToken,
  syncWithStorage,
} = customerSlice.actions;

// Export utility functions
export { 
  silentTokenRefresh, 
  loadFromStorage, 
  saveToStorage, 
  clearStorage,
  validateCustomerData 
};

export default customerSlice.reducer;