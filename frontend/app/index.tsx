import { useEffect } from "react";
import { router } from "expo-router";

import { validateStoredSession } from "../src/utils/auth";

export default function Index() {
  useEffect(() => {
    const init = async () => {
      const user = await validateStoredSession();

      if (user?.token) {
        router.replace("/(tabs)/home"); // logged in
      } else {
        router.replace("/splash-screen" as never); // not logged in
      }
    };

    init();
  }, []);

  return null;
}
