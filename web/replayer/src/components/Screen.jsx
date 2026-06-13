import { ScrollArea } from "./ui/scroll-area";
import { useEffect, useRef } from "react";

export default function Screen({
  docText = "",
  caretPos = 0,
  highlight = null,
}) {
  caretPos = Math.min(Math.max(caretPos, 0), docText.length);

  // session gaps highlight
  const highlightRef = useRef(null);
  const highlightParts = Array.isArray(highlight?.parts)
    ? [...highlight.parts].sort(
        (a, b) => (a.start ?? a.pos ?? 0) - (b.start ?? b.pos ?? 0),
      )
    : [];
  const shouldRenderParts = highlightParts.length > 0;

  // paste insertion highlight
  const highlightStart =
    highlight && typeof highlight.start === "number"
      ? Math.min(Math.max(highlight.start, 0), docText.length)
      : null;
  const highlightEnd =
    highlight && typeof highlight.end === "number"
      ? Math.min(Math.max(highlight.end, highlightStart ?? 0), docText.length)
      : null;
  const shouldRenderHighlight =
    highlightStart !== null &&
    highlightEnd !== null &&
    highlightEnd > highlightStart;

  useEffect(() => {
    if (!shouldRenderHighlight && !shouldRenderParts) return;

    highlightRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [highlight]);

  if (shouldRenderParts) {
    const nodes = [];
    let cursor = 0;

    for (let index = 0; index < highlightParts.length; index++) {
      const part = highlightParts[index];
      const partStart = Math.min(
        Math.max(part.start ?? part.pos ?? cursor, cursor),
        docText.length,
      );
      const partEnd =
        part.type === "insert"
          ? Math.min(Math.max(part.end ?? partStart, partStart), docText.length)
          : partStart;

      if (cursor < partStart) {
        nodes.push(docText.slice(cursor, partStart));
      }

      if (part.type === "delete") {
        nodes.push(
          <mark
            className="rounded-sm bg-red-500/15 px-0.5 text-red-700 line-through decoration-red-700"
            key={part.key}
            ref={index === 0 ? highlightRef : null}
          >
            {part.text}
          </mark>,
        );
      } else {
        nodes.push(
          <mark
            className={`rounded-sm px-0.5 ${
              part.color === "red"
                ? "bg-red-500/20 text-red-700"
                : "bg-green-500/20 text-green-700"
            }`}
            key={part.key}
            ref={index === 0 ? highlightRef : null}
          >
            {docText.slice(partStart, partEnd)}
          </mark>,
        );
        cursor = partEnd;
        continue;
      }

      cursor = partStart;
    }

    if (cursor < docText.length) {
      nodes.push(docText.slice(cursor));
    }

    return (
      <ScrollArea className="flex w-full h-full justify-center items-center whitespace-pre-wrap overflow-auto font-sans p-2 leading-loose space-y-2">
        <article>{nodes}</article>
      </ScrollArea>
    );
  }

  if (shouldRenderHighlight) {
    return (
      <ScrollArea className="flex w-full h-full justify-center items-center whitespace-pre-wrap overflow-auto font-sans p-2 leading-loose space-y-2">
        <article>
          {docText.slice(0, highlightStart)}
          <mark
            className={`rounded-sm px-0.5 ${
              highlight.color === "red"
                ? "bg-red-500/20 text-red-700"
                : "bg-green-500/20 text-green-700"
            }`}
            ref={highlightRef}
          >
            {docText.slice(highlightStart, highlightEnd)}
          </mark>
          {docText.slice(highlightEnd)}
        </article>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex w-full h-full justify-center items-center whitespace-pre-wrap overflow-auto font-sans p-2 leading-loose space-y-2">
      <article>
        {docText.slice(0, caretPos)}
        <span className="inline-block h-5 border-l border-foreground align-text-bottom animate-[blink_1s_linear_infinite]" />
        {docText.slice(caretPos)}
      </article>
    </ScrollArea>
  );
}
