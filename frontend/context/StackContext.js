import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@peptalk_stack';
const StackContext = createContext();

export function StackProvider({ children }) {
  const [stack, setStack] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) setStack(JSON.parse(json));
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

  return (
    <StackContext.Provider value={{ stack, addItem, removeItem, loaded }}>
      {children}
    </StackContext.Provider>
  );
}

export function useStack() {
  return useContext(StackContext);
}
