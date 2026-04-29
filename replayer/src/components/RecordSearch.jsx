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
          {status === "loading" ? "Searching" : "Search"}
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
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function SearchResults({ results, handleResultClick }) {
  return (
    <>
      {results.length > 0 ? (
        <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto scroll-smooth rounded-md pr-1">
          {results.map((result) => (
            <button
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 snap-start"
              key={result.d_id}
              type="button"
              onClick={() => handleResultClick(result)}
            >
              <span className="block font-semibold text-gray-900">
                {result.title || "Untitled"}
              </span>
              <span className="block text-xs text-gray-500">
                {result.author || "Unknown author"} ·{" "}
                {new Date(result.t0).toLocaleString() || "Unknown date"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <span className="mt-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
          No results found.
        </span>
      )}
    </>
  );
}

export default function RecordSearch({ onRecordLoaded }) {
  const [searchOption, setSearchOption] = useState("title");
  const [query, setQuery] = useState("");
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
      <SearchResults results={results} handleResultClick={handleResultClick} />
    </div>
  );
}
