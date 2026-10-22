import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const monitorEvents = (events) =>
  api.post('/monitor', events).then((r) => r.data);

export const getAlerts = (params = {}) =>
  api.get('/alerts', { params }).then((r) => r.data);

export const getAlertById = (id) =>
  api.get(`/alerts/${id}`).then((r) => r.data);

export const resolveAlert = (id) =>
  api.patch(`/alerts/${id}/resolve`).then((r) => r.data);

export const acknowledgeAlert = (id) =>
  api.patch(`/alerts/${id}/acknowledge`).then((r) => r.data);

export const getHealth = () =>
  axios.get('/health', { timeout: 5000 }).then((r) => r.data);

export const sendAlertEmail = (id, email) =>
  api.post(`/alerts/${id}/email`, { email }).then((r) => r.data);

export default api;
