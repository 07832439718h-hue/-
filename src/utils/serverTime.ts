import { useState, useEffect } from 'react';

let globalServerTimeOffset = 0; // ms offset between server time and client time
let isSynced = false;

export const syncServerTime = async () => {
  try {
    const start = Date.now();
    const res = await fetch('/api/server-time');
    const data = await res.json();
    if (data.serverTime) {
      const roundTrip = Date.now() - start;
      const serverTimeMs = data.serverTime + roundTrip / 2;
      globalServerTimeOffset = serverTimeMs - Date.now();
      isSynced = true;
    }
  } catch (err) {
    globalServerTimeOffset = 0;
  }
};

/**
 * Returns the authoritative date/time synchronized precisely with Babylon, Iraq (Asia/Baghdad)
 */
export const getServerNow = (): Date => {
  try {
    const rawDate = new Date(Date.now() + globalServerTimeOffset);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Baghdad',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(rawDate);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    
    const year = getPart('year');
    const month = getPart('month') - 1;
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return new Date(year, month, day, hour, minute, second);
  } catch {
    return new Date();
  }
};

/**
 * Hook providing live authoritative Iraq time
 */
export const useServerTime = () => {
  const [now, setNow] = useState<Date>(getServerNow());

  useEffect(() => {
    syncServerTime();
    const interval = setInterval(() => {
      setNow(getServerNow());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { now, isSynced };
};
