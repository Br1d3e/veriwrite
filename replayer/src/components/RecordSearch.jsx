import { useState } from "react";
import {
  getRecordById,
  queryAuthor,
  queryTitle,
} from "../../modules/recordApi.js";
import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Button } from "./ui/button.jsx";

function SearchBar({ handleSearch, status, query, setQuery }) {
  return (
    <InputGroup className="rounded-lg border w-80 border-gray-200">
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
          className={"bg-blue-500 hover:bg-blue-400 text-white"}
          onClick={handleSearch}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Searching" : "Search"}
        </Button>
      </InputGroupAddon>
    </InputGroup>
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

function SearchError({ error }) {
  return (
    <>
      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
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
      console.log(nextResults);
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
      setStatus("idle");
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Unable to load record.");
    }
  }

  return (
    <>
      {/* Search bar design <!-- From Uiverse.io by emmanuelh-dev -->  */}
      <div className={`grid items-center justify-center grid-rows-1`}>
        <SearchBar
          handleSearch={handleSearch}
          status={status}
          query={query}
          setQuery={setQuery}
        />
        <fieldset className="mt-5 w-full">
          <legend className="mb-2 text-sm font-semibold text-gray-600">
            Search Mode
          </legend>
          <div className="grid grid-cols-2 rounded-xl bg-gray-100 p-1 shadow-sm">
            {options.map((option) => {
              const isSelected = searchOption === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  className={`flex h-8 items-center cursor-pointer justify-center rounded-lg px-8 text-base font-semibold transition ${
                    isSelected
                      ? "bg-white text-gray-950 shadow-sm ring-1 ring-gray-100 border-2 border-blue-400"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                  }`}
                  onClick={() => setSearchOption(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <SearchError error={error} />
        <SearchResults
          results={results}
          handleResultClick={handleResultClick}
        />
      </div>
    </>
  );
}
