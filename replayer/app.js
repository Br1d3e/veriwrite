const fileEl = document.getElementById("file");
const screenEl = document.getElementById("screen");

fileEl.addEventListener("change", async () => {
  const f = fileEl.files?.[0];
  if (!f) return;
  const text = await f.text();
  const record = JSON.parse(text);
  const first = record?.events?.[0]?.fullText ?? "";
  screenEl.textContent = first;
});
