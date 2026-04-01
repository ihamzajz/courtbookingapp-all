import * as SecureStore from "expo-secure-store";

import { AUTH_API } from "../config/api";
import { disconnectRealtime, setRealtimeAuthToken } from "../lib/realtime";

const USER_STORAGE_KEY = "user";

export async function getStoredUser() {
  const rawUser = await SecureStore.getItemAsync(USER_STORAGE_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    return null;
  }
}

export async function setStoredUser(user) {
  await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
  setRealtimeAuthToken(user?.token || null);
}

export async function clearStoredUser() {
  await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
  setRealtimeAuthToken(null);
  disconnectRealtime();
}

export async function getStoredToken() {
  const user = await getStoredUser();
  return user?.token || null;
}

export async function validateStoredSession(options = {}) {
  const { clearOnFail = true } = options;
  const storedUser = await getStoredUser();

  if (!storedUser?.token) {
    return null;
  }

  try {
    const res = await fetch(`${AUTH_API}/me`, {
      headers: {
        Authorization: `Bearer ${storedUser.token}`,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      if (clearOnFail && (res.status === 401 || res.status === 403)) {
        await clearStoredUser();
        return null;
      }

      setRealtimeAuthToken(storedUser.token);
      return storedUser;
    }

    const nextUser = { ...storedUser, ...data, token: storedUser.token };
    await setStoredUser(nextUser);
    return nextUser;
  } catch {
    setRealtimeAuthToken(storedUser.token);
    return storedUser;
  }
}
