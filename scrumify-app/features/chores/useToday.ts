// Tracks the browser's local date so chore labels update when the day changes
"use client";

import { useEffect, useState } from "react";

export function useToday() {
  // Wait for the browser before choosing a date, since the server may use another time zone
  const [today, setToday] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function updateToday() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      setToday(`${year}-${month}-${day}`);

      // Use local midnight instead of adding 24 hours, since daylight saving can change the day's length
      const midnight = new Date(year, now.getMonth(), now.getDate() + 1);
      clearTimeout(timer);
      timer = setTimeout(updateToday, midnight.getTime() - now.getTime());
    }

    updateToday();
    window.addEventListener("focus", updateToday);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", updateToday);
    };
  }, []);

  return today;
}
