// Fetch document's metadata and content
import { normalizeLines } from "./utils";

export async function getDocTitle() {
  try {
    return await Word.run(async (context) => {
      const props = context.document.properties;
      props.load("title");
      await context.sync();
      return props.title || "Untitled";
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