export const RECORD_API_URL =
  import.meta.env.VITE_RECORD_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8443" : "");

export const LLM_API_URL =
  import.meta.env.VITE_LLM_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "/api");
