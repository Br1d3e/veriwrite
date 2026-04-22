import psycopg
from store_db import DATABASE_URL

def connect():
    return psycopg.connect(DATABASE_URL)

def query_title(title: str):
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT d_id, title, similarity(title, %(query)s) AS sim
                FROM docs
                WHERE title IS NOT NULL
                  AND similarity(title, %(query)s) > 0.3
                ORDER BY sim DESC
                LIMIT 5
                """,
                {"query": title}
            )
            rows = cursor.fetchall()
            if not rows:
                raise ValueError(f"document not found: {title}")
            return [
                {"d_id": row[0], "title": row[1], "sim": float(row[2])}
                for row in rows
            ]

def query_author(author: str):
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT d_id, author, similarity(author, %(query)s) AS sim
                FROM docs
                WHERE author IS NOT NULL
                  AND similarity(author, %(query)s) > 0.3
                ORDER BY sim DESC
                LIMIT 5
                """,
                {"query": author}
            )
            rows = cursor.fetchall()
            if not rows:
                raise ValueError(f"author not found: {author}")
            return [
                {"d_id": row[0], "author": row[1], "sim": float(row[2])}
                for row in rows
            ]
