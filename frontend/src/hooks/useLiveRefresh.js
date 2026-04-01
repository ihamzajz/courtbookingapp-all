import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

export default function useLiveRefresh(callback, options = {}) {
  const {
    enabled = true,
    intervalMs = 15000,
    runOnFocus = true,
  } = options;

  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return undefined;
      }

      if (runOnFocus) {
        callbackRef.current();
      }

      const intervalId = setInterval(() => {
        callbackRef.current();
      }, intervalMs);

      const appStateSubscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          callbackRef.current();
        }
      });

      return () => {
        clearInterval(intervalId);
        appStateSubscription.remove();
      };
    }, [enabled, intervalMs, runOnFocus])
  );
}
