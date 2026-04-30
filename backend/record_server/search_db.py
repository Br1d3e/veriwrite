import psycopg
try:
    from .store_db import DATABASE_URL
except ImportError: 
    from backend.record_server.store_db import DATABASE_URL

def connect():
    return psycopg.connect(DATABASE_URL)

def query_title(title: str, limit: int = 10):
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT d_id, title, author, similarity(title, %(query)s) AS sim, created_server_ts, updated_server_ts, integrity_status
                FROM docs
                WHERE title IS NOT NULL
                  AND similarity(title, %(query)s) > 0.3
                ORDER BY sim DESC
                LIMIT %(limit)s
                """,
                {"query": title, "limit": limit}
            )
            rows = cursor.fetchall()
            return [
                {"d_id": row[0], "title": row[1], "author": row[2], "sim": float(row[3]), "t0": row[4], "tn": row[5], "status": row[6]}
                for row in rows
            ]

def query_author(author: str, limit: int = 10):
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT d_id, author, title, similarity(author, %(query)s) AS sim, created_server_ts, updated_server_ts, integrity_status
                FROM docs
                WHERE author IS NOT NULL
                  AND similarity(author, %(query)s) > 0.5
                ORDER BY sim DESC
                LIMIT %(limit)s
                """,
                {"query": author, "limit": limit}
            )
            rows = cursor.fetchall()
            return [
                {"d_id": row[0], "author": row[1], "title": row[2], "sim": float(row[3]), "t0": row[4], "tn": row[5], "status": row[6]}
                for row in rows
            ]
