import { useEffect } from "react";

import { subscribeToRealtime } from "../lib/realtime";

export default function useRealtimeSubscription(events, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return subscribeToRealtime(events, handler);
  }, [enabled, events, handler]);
}
