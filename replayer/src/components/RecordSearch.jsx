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
import {
  AlertCircleIcon,
  BanIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  FileQuestionMark,
  Search,
} from "lucide-react";
import { Badge } from "./ui/badge.jsx";

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
      <InputGroupAddon align="inline-end">
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
      <TabsList className="grid w-full grid-cols-2">
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

function BadgeVerified() {
  return (
    <Badge className="border-none bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5">
      <CheckCircle2Icon className="size-3" />
      Verified
    </Badge>
  );
}

function BadgeNeedsReview() {
  return (
    <Badge className="border-none bg-amber-600/10 text-amber-600 focus-visible:ring-amber-600/20 focus-visible:outline-none dark:bg-amber-400/10 dark:text-amber-400 dark:focus-visible:ring-amber-400/40 [a&]:hover:bg-amber-600/5 dark:[a&]:hover:bg-amber-400/5">
      <AlertCircleIcon className="size-3" />
      Needs review
    </Badge>
  );
}

function BadgeRisk() {
  return (
    <Badge className="bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive border-none focus-visible:outline-none">
      <BanIcon className="size-3" />
      Risk
    </Badge>
  );
}

function BadgeUnverified() {
  return (
    <Badge className="border-none" variant="secondary">
      <FileQuestionMark className="size-3" />
      Unverified
    </Badge>
  );
}

function IntegrityBadge({ status = "UNVERIFIED" }) {
  switch (status) {
    case "VERIFIED":
      return <BadgeVerified />;
    case "NEEDS_REVIEW":
      return <BadgeNeedsReview />;
    case "RISK":
      return <BadgeRisk />;
    case "UNVERIFIED":
      return <BadgeUnverified />;
    default:
      return <BadgeUnverified />;
  }
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
