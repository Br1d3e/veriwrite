
from store_db import DATABASE_URL
import pandas as pd
import psycopg

class AnalyzeDB:
    def __init__(self):
        self.d_id = None
        self.record = {
            "v": 3,
            "m": {},
            "s": []
        }
        self.doc = None

    def _connect(self):
        return psycopg.connect(DATABASE_URL)

    def load_docs(self):
        with self._connect() as conn:
            return pd.read_sql_query(
                """
                SELECT * 
                FROM docs
                """,
                conn
            )
            
    def load_sessions(self):
        with self._connect() as conn:
            return pd.read_sql_query(
                """
                SELECT * 
                FROM sessions
                ORDER BY d_id, st0, sid
                """,
                conn
            )
            

    def load_blocks(self, sid: str, d_id: str | None = None):
        with self._connect() as conn:
            if d_id:
                return pd.read_sql_query(
                    """
                    SELECT *
                    FROM blocks
                    WHERE sid = %(sid)s AND d_id = %(d_id)s
                    ORDER BY q
                    """,
                    conn,
                    params={"sid": sid, "d_id": d_id},
                )
            return pd.read_sql_query(
                """
                SELECT *
                FROM blocks
                WHERE sid = %(sid)s
                ORDER BY q
                """,
                conn,
                params={"sid": sid},
            )
        
    def get_doc(self, d_id: str):
        docs = self.load_docs()
        matched = docs[docs["d_id"] == d_id]
        if matched.empty:
            raise ValueError(f"document not found: {d_id}")
        if len(matched.index) != 1:
            raise ValueError(f"expected exactly one document row for {d_id}, got {len(matched.index)}")
        self.doc = matched.iloc[0]
        return self.doc
        
    def query_title(self, title: str) -> str:
        """
        N-gram text rough match
        returns `docId`
        """
        pass

    def query_author(self, author: str) -> str:
        """
        returns `docId`
        """
        pass

    def load_d_id(self, d_id: str | None = None, title: str | None = None, author: str | None = None):
        if self.d_id:
            return self.d_id
        if d_id:
            self.d_id = d_id
        elif title:
            self.d_id = self.query_title(title)
        elif author:
            self.d_id = self.query_author(author)
        else:
            return None
        return self.d_id

    def set_d_id(self, d_id: str):
        self.d_id = d_id

    def get_d_id(self):
        return self.d_id
    

    def fetch_doc_meta(self):
        if not self.d_id:
            return
        self.get_doc(self.d_id)
        self.record["m"] = {
            "dId": self.doc["d_id"],
            "t0": self.doc["t0"],
            "tn": self.doc["updated_server_ts"],
            "ttl": self.doc["title"],
            "a": self.doc["author"]
        }


    def get_record(self):
        if not self.d_id:
            raise ValueError("d_id is not loaded")
        if self.record["m"] is None:
            self.fetch_doc_meta()
        return self.record


if __name__ == "__main__":
    a = AnalyzeDB()
    a.load_d_id(d_id="83cd8058-ee7d-4097-b7fa-d11c543c98c5")
    print(a.get_record())
