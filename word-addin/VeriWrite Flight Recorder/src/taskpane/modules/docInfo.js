// Fetch document's metadata and content
import { normalizeLines } from "./utils";

function titleFromUrl(fileUrl) {
  if (!fileUrl) return "";
  try {
    const { pathname } = new URL(fileUrl);
    const fileName = pathname.split(/[\\/]/).pop() || "";
    return decodeURIComponent(fileName).replace(/\.[^.]+$/, "");
  } catch {
    const fileName = String(fileUrl).split(/[\\/]/).pop() || "";
    return decodeURIComponent(fileName)
      .replace(/\?.*$/, "")
      .replace(/\.[^.]+$/, "");
  }
}

function getFileUrl() {
  return new Promise((resolve) => {
    Office.context.document.getFilePropertiesAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value.url || "");
      } else {
        resolve("");
      }
    });
  });
}

export async function getDocTitle() {
  try {
    const fileTitle = titleFromUrl(await getFileUrl());
    if (fileTitle) return fileTitle;

    return await Word.run(async (context) => {
      const props = context.document.properties;
      props.load("title");
      await context.sync();
      const title = props.title && props.title.trim();
      return title || "Untitled";
    });
  } catch {
    return "Untitled";
  }
}

export async function getDocAuthor() {
  try {
    return await Word.run(async (context) => {
      const props = context.document.properties;
      props.load("author");
      await context.sync();
      return props.author || "Unknown";
    });
  } catch {
    return "Unknown";
  }
}

export async function readBodyText() {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return normalizeLines(body.text) || "";
  });
}
