import { useState } from "react";
import {
  getRecordById,
  queryAuthor,
  queryTitle,
} from "../../modules/recordApi.js";
import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Button } from "./ui/button.jsx";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRightIcon } from "lucide-react";

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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger
          key="search-mode"
          value=""
          className="bg-primary-foreground text-foreground"
          disabled
        >
          Search Mode
        </TabsTrigger>
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="focus:border-primary"
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
  return (
    <>
      {results.length > 0 ? (
        <ScrollArea className={`max-h-80 rounded-md border ${className}`}>
          <div className="grid gap-2 p-2">
            {results.map((result) => (
              <Button
                className="h-auto justify-start rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
                key={result.d_id}
                type="button"
                variant="ghost"
                onClick={() => {
                  handleResultClick(result);
                  setHasSearched(true);
                }}
              >
                <span className="grid gap-1">
                  <span className="block font-semibold">
                    {result.title || "Untitled"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {result.author || "Unknown author"} ·{" "}
                    {new Date(result.t0).toLocaleString() || "Unknown date"}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 ml-auto" />
              </Button>
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
