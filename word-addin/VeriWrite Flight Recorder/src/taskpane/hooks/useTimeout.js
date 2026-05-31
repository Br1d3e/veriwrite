import { useRef, useEffect } from "react";

export function useTimeout(callback, delay) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return undefined;
    const handler = setTimeout(() => {
      callbackRef.current();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [delay]);
}
