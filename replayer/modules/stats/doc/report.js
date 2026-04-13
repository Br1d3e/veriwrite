/**
 * @fileoverview AI generated report for document stats.
 */

export async function docReport(docStats) {
    const res = await fetch("/api/doc-report", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            documentStats: docStats,
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
    }

    return res.json();
}
