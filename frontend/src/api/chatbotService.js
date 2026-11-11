import apiClient from './BaseApi';

// skipGlobalForbidden lets the widget display a scoped denial without redirecting the whole workspace.
const options = (signal) => ({ signal, skipGlobalForbidden: true });
export const chatbotApi = {
  status: (signal) => apiClient.get('Chatbot/status', options(signal)),
  threads: (skip = 0, signal) => apiClient.get(`Chatbot/threads?skip=${skip}`, options(signal)),
  create: (signal) => apiClient.post('Chatbot/threads', {}, options(signal)),
  messages: (id, signal) => apiClient.get(`Chatbot/threads/${id}/messages`, options(signal)),
  send: (id, message, requestId, signal) => apiClient.post(`Chatbot/threads/${id}/messages`, { message, requestId }, options(signal)),
  remove: (id, signal) => apiClient.delete(`Chatbot/threads/${id}`, options(signal)),
};
