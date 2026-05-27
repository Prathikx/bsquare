import axios from "axios";

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || "/api", timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null) => { failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token)); failedQueue = []; };

api.interceptors.response.use(res => res, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && error.response?.data?.code === "TOKEN_EXPIRED" && !original._retry) {
    if (isRefreshing) return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
      .then(token => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
    original._retry = true; isRefreshing = true;
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) { localStorage.clear(); window.location.href = "/login"; return Promise.reject(error); }
    try {
      const { data } = await axios.post("/api/auth/refresh", { refreshToken });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
      processQueue(null, data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (err) { processQueue(err, null); localStorage.clear(); window.location.href = "/login"; return Promise.reject(err); }
    finally { isRefreshing = false; }
  }
  return Promise.reject(error);
});

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout", { refreshToken: localStorage.getItem("refreshToken") }),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/me", data),
  changePassword: (data) => api.put("/auth/change-password", data),
  updateLocation: (data) => api.put("/auth/location", data),
};

export const usersAPI = {
  nearby: (params) => api.get("/users/nearby", { params }),
  profile: (userId) => api.get(`/users/${userId}`),
};

export const connectionsAPI = {
  list: () => api.get("/connections"),
  receivedRequests: () => api.get("/connections/requests/received"),
  sentRequests: () => api.get("/connections/requests/sent"),
  sendRequest: (targetId) => api.post(`/connections/request/${targetId}`),
  acceptRequest: (requestId) => api.put(`/connections/request/${requestId}/accept`),
  declineRequest: (requestId) => api.put(`/connections/request/${requestId}/decline`),
  cancelRequest: (requestId) => api.delete(`/connections/request/${requestId}`),
  remove: (targetId) => api.delete(`/connections/${targetId}`),
};

export const messagesAPI = {
  conversations: () => api.get("/messages"),
  getConversation: (targetId, params) => api.get(`/messages/${targetId}`, { params }),
  send: (targetId, content) => api.post(`/messages/${targetId}`, { content }),
};

export const adminAPI = {
  stats: () => api.get("/admin/stats"),
  pending: () => api.get("/admin/pending"),
  users: (params) => api.get("/admin/users", { params }),
  approve: (userId, notes) => api.put(`/admin/users/${userId}/approve`, { notes }),
  reject: (userId, reason) => api.put(`/admin/users/${userId}/reject`, { reason }),
  deactivate: (userId) => api.put(`/admin/users/${userId}/deactivate`),
};

export default api;
