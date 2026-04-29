
const SERVER_URL = "http://127.0.0.1:8443";


async function postJson(path, body) {
    const response = await fetch(`${SERVER_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`REQUEST ${path} FAILED: ${await response.text()}`);
    }

    return response.json();
}


export async function queryTitle(title, limit = 10) {
    return await postJson("/query/title", {title, limit});
}

export async function queryAuthor(author, limit = 10) {
    return await postJson("/query/author", {author, limit});
}

export async function getRecordById(docId) {
    return await postJson("/record/load", {d_id: docId});
}
