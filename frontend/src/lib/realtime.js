import { io } from "socket.io-client";

import { BASE_URL } from "../config/api";

let socket;
let authToken = null;

const getSocket = () => {
  if (!socket) {
    socket = io(BASE_URL, {
      autoConnect: false,
      auth: {},
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
  }

  return socket;
};

export const setRealtimeAuthToken = (token) => {
  authToken = token || null;

  if (!socket) {
    return;
  }

  socket.auth = authToken ? { token: authToken } : {};
};

export const connectRealtime = () => {
  const client = getSocket();
  client.auth = authToken ? { token: authToken } : {};

  if (!client.connected) {
    client.connect();
  }

  return client;
};

export const disconnectRealtime = () => {
  if (!socket) {
    return;
  }

  socket.disconnect();
};

export const subscribeToRealtime = (events, callback) => {
  const client = connectRealtime();
  const eventList = Array.isArray(events) ? events : [events];

  eventList.forEach((eventName) => {
    client.on(eventName, callback);
  });

  return () => {
    eventList.forEach((eventName) => {
      client.off(eventName, callback);
    });
  };
};
