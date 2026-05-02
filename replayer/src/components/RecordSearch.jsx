import { useState } from "react";
import {
  getRecordById,
  queryAuthor,
  queryTitle,
} from "../../modules/recordApi.js";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Button } from "./ui/button.jsx";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRightIcon, Search } from "lucide-react";
import IntegrityBadge from "@/components/IntegrityBadge";

function SearchBar({ handleSearch, status, query, setQuery }) {
  return (
    <InputGroup className="rounded-lg border w-full flex-1 border-gray-200">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        placeholder="Search document..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleSearch(event);
          }
        }}
      />
      <InputGroupAddon align="right">
        <Button
          type="button"
          onClick={handleSearch}
          disabled={status === "loading"}
          className="cursor-pointer hover:bg-primary/80"
        >
          {status === "loading" ? "Loading" : "Search"}
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}

function SearchMode({
  options,
  searchOption,
  setSearchOption,
  className = "",
}) {
  return (
    <Tabs
      value={searchOption}
      onValueChange={setSearchOption}
      className={`mt-5 w-full ${className}`}
    >
      <TabsList className="grid w-full grid-cols-2">
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="focus:border-primary cursor-pointer"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function SearchResults({
  results,
  handleResultClick,
  hasSearched,
  setHasSearched,
  className = "",
}) {
  const resultRows = results.map((result) => ({
    ...result,
    metaText: `${result.author || "Unknown author"} · ${
      result.t0 ? new Date(result.t0).toLocaleString() : "Unknown date"
    }`,
  }));

  return (
    <>
      {results.length > 0 ? (
        <ScrollArea className={`max-h-100 rounded-md border ${className}`}>
          <div className="grid gap-2 p-2">
            {resultRows.map((result) => (
              <button
                className="grid w-full grid-cols-[minmax(0,1fr)_9.5rem_1rem] items-center gap-4 rounded-md border border-border bg-background px-5 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                key={result.d_id}
                type="button"
                onClick={() => {
                  handleResultClick(result);
                  setHasSearched(true);
                }}
              >
                <span className="min-w-0 space-y-1">
                  <span className="block truncate font-semibold">
                    {result.title || "Untitled"}
                  </span>
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-5 text-muted-foreground">
                    {result.metaText}
                  </span>
                </span>
                <span className="justify-self-end">
                  <IntegrityBadge status={result.status} />
                </span>
                <ChevronRightIcon className="size-4 shrink-0" />
              </button>
            ))}
          </div>
        </ScrollArea>
      ) : hasSearched ? (
        <span className="mt-3 rounded-md border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          No results found.
        </span>
      ) : null}
    </>
  );
}

export default function RecordSearch({ onRecordLoaded }) {
  const [searchOption, setSearchOption] = useState("title");
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const options = [
    { label: "Title", value: "title" },
    { label: "Author", value: "author" },
  ];

  async function handleSearch(event) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    setHasSearched(true);

    try {
      setStatus("loading");
      setError("");
      const nextResults =
        searchOption === "title"
          ? await queryTitle(trimmedQuery, 30)
          : await queryAuthor(trimmedQuery, 30);
      setResults(nextResults || []);
      setStatus("idle");
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Search failed.");
      setResults([]);
    }
  }

  async function handleResultClick(result) {
    if (!result?.d_id) return;

    try {
      setStatus("loading");
      setError("");
      const record = await getRecordById(result.d_id);
      onRecordLoaded?.({
        nextRecord: record,
        source: "server",
      });
      toast.success(
        `Loaded record: ${record?.m?.title || record?.title || "Untitled"}`,
      );
      setStatus("idle");
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Unable to load record.");
      toast.error(err.message || "Unable to load record.");
    }
  }

  return (
    <div className="grid w-full grid-rows-1">
      <SearchBar
        handleSearch={handleSearch}
        status={status}
        query={query}
        setQuery={setQuery}
      />
      <SearchMode
        options={options}
        searchOption={searchOption}
        setSearchOption={setSearchOption}
      />
      <SearchResults
        results={results}
        handleResultClick={handleResultClick}
        hasSearched={hasSearched}
        setHasSearched={setHasSearched}
        className="mt-5"
      />
    </div>
  );
}
