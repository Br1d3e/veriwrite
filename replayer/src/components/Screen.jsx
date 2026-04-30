import { ScrollArea } from "./ui/scroll-area";

export default function Screen({ docText = "", caretPos = 0 }) {
  caretPos = Math.min(Math.max(caretPos, 0), docText.length);
  return (
    <ScrollArea className="flex w-full h-full justify-center items-center border border-border whitespace-pre-wrap overflow-auto font-sans p-5">
      <article>{docText.slice(0, caretPos)}</article>
      <span className="inline-block w-0 h-3 m-0 p-0 align-text-bottom animate-pulse"></span>
      <article>{docText.slice(caretPos)}</article>
    </ScrollArea>
  );
}
