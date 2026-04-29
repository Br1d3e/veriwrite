import { useState } from "react";
import {
  getRecordById,
  queryAuthor,
  queryTitle,
} from "../../modules/recordApi.js";

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

export default function SearchBar({ onRecordLoaded }) {
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
      <div className="grid items-center justify-center p-5 mt-10 grid-rows-1">
        <form
          className="rounded-lg border border-gray-200"
          onSubmit={handleSearch}
        >
          <div className="flex">
            <div className="flex w-10 items-center justify-center rounded-tl-lg rounded-bl-lg border-r border-gray-200 bg-white p-5">
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="pointer-events-none absolute w-5 fill-gray-500 transition"
              >
                <path d="M16.72 17.78a.75.75 0 1 0 1.06-1.06l-1.06 1.06ZM9 14.5A5.5 5.5 0 0 1 3.5 9H2a7 7 0 0 0 7 7v-1.5ZM3.5 9A5.5 5.5 0 0 1 9 3.5V2a7 7 0 0 0-7 7h1.5ZM9 3.5A5.5 5.5 0 0 1 14.5 9H16a7 7 0 0 0-7-7v1.5Zm3.89 10.45 3.83 3.83 1.06-1.06-3.83-3.83-1.06 1.06ZM14.5 9a5.48 5.48 0 0 1-1.61 3.89l1.06 1.06A6.98 6.98 0 0 0 16 9h-1.5Zm-1.61 3.89A5.48 5.48 0 0 1 9 14.5V16a6.98 6.98 0 0 0 4.95-2.05l-1.06-1.06Z"></path>
              </svg>
            </div>
            <input
              type="text"
              className="w-96 bg-white pl-2 text-base font-semibold outline-0"
              placeholder="Search document..."
              id="search-bar"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className="border-l border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
              type="submit"
              disabled={!query.trim() || status === "loading"}
            >
              {status === "loading" ? "Searching" : "Search"}
            </button>
          </div>
        </form>
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
