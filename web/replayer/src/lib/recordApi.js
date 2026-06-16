import { RECORD_API_URL, LLM_API_URL, ENABLE_LLM_REPORTS } from "./apiConfig";

function apiUrl(base, path) {
  return `${base.replace(/\/$/, "")}${path}`;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`REQUEST ${url} FAILED: ${await response.text()}`);
  }

  return response.json();
}

export async function queryTitle(title, limit = 10) {
  return await postJson(apiUrl(RECORD_API_URL, "/query/title"), {
    title,
    limit,
  });
}

export async function queryAuthor(author, limit = 10) {
  return await postJson(apiUrl(RECORD_API_URL, "/query/author"), {
    author,
    limit,
  });
}

export async function getRecordById(docId) {
  return await postJson(apiUrl(RECORD_API_URL, "/load"), { d_id: docId });
}

export async function getLLMReport(statsPayload, type, token) {
  if (type !== "doc-report" && type !== "ses-report") return;
  return await postJson(apiUrl(LLM_API_URL, `/${type}`), {
    statsPayload,
    token,
  });
}

export async function refreshLLMToken(docId) {
  if (!ENABLE_LLM_REPORTS) return;
  return await postJson(apiUrl(LLM_API_URL, "/token"), {
    d_id: docId,
  });
}
