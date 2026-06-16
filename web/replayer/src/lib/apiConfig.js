const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

export const RECORD_API_URL =
  import.meta.env.VITE_RECORD_API_URL || `${API_URL}/record`;

export const LLM_API_URL = import.meta.env.VITE_LLM_API_URL || `${API_URL}/llm`;

export const ENABLE_LLM_REPORTS =
  import.meta.env.VITE_ENABLE_LLM_REPORTS ?? false;
