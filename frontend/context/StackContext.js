import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateItem } from '../utils/schedule';

const STORAGE_KEY = '@peptalk_stack';
const LOG_PREFIX = '@peptalk_log_'; // per-date keys: @peptalk_log_2026-04-07

const StackContext = createContext();

export function StackProvider({ children }) {
  const [stack, setStack] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState({}); // { "2026-04-07": ["id1", "id3"] }

  // Load and migrate stack on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) {
        const parsed = JSON.parse(json);
        const migrated = parsed.map(migrateItem);
        setStack(migrated);
        // Persist migrated data back if any items changed
        if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((newStack) => {
    setStack(newStack);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newStack));
  }, []);

  const addItem = useCallback((item) => {
    persist([...stack, { ...item, id: Date.now().toString() }]);
  }, [stack, persist]);

  const removeItem = useCallback((id) => {
    persist(stack.filter((s) => s.id !== id));
  }, [stack, persist]);

  const updateItem = useCallback((id, fields) => {
    persist(stack.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  }, [stack, persist]);

  // --- Dose Logging ---

  const loadLogsForDate = useCallback(async (dateString) => {
    // Skip if already loaded
    if (logs[dateString] !== undefined) return logs[dateString];
    const json = await AsyncStorage.getItem(LOG_PREFIX + dateString);
    const ids = json ? JSON.parse(json) : [];
    setLogs((prev) => ({ ...prev, [dateString]: ids }));
    return ids;
  }, [logs]);

  // Batch-load a set of dates (e.g. a visible week) in one pass, skipping any
  // already in the cache. Reads the same per-date keys as loadLogsForDate — no
  // change to the persistence format.
  const loadLogsForDates = useCallback(async (dateStrings) => {
    const missing = dateStrings.filter((d) => logs[d] === undefined);
    if (missing.length === 0) return;
    const entries = await Promise.all(
      missing.map(async (d) => {
        const json = await AsyncStorage.getItem(LOG_PREFIX + d);
        return [d, json ? JSON.parse(json) : []];
      })
    );
    setLogs((prev) => {
      const next = { ...prev };
      for (const [d, ids] of entries) {
        if (next[d] === undefined) next[d] = ids;
      }
      return next;
    });
  }, [logs]);

  const logDose = useCallback(async (dateString, itemId) => {
    const current = logs[dateString] || [];
    if (current.includes(itemId)) return;
    const updated = [...current, itemId];
    setLogs((prev) => ({ ...prev, [dateString]: updated }));
    await AsyncStorage.setItem(LOG_PREFIX + dateString, JSON.stringify(updated));
  }, [logs]);

  const unlogDose = useCallback(async (dateString, itemId) => {
    const current = logs[dateString] || [];
    const updated = current.filter((id) => id !== itemId);
    setLogs((prev) => ({ ...prev, [dateString]: updated }));
    await AsyncStorage.setItem(LOG_PREFIX + dateString, JSON.stringify(updated));
  }, [logs]);

  const isLogged = useCallback((dateString, itemId) => {
    const dayLogs = logs[dateString];
    return dayLogs ? dayLogs.includes(itemId) : false;
  }, [logs]);

  return (
    <StackContext.Provider
      value={{
        stack,
        addItem,
        removeItem,
        updateItem,
        loaded,
        logs,
        loadLogsForDate,
        loadLogsForDates,
        logDose,
        unlogDose,
        isLogged,
      }}
    >
      {children}
    </StackContext.Provider>
  );
}

export function useStack() {
  return useContext(StackContext);
}
