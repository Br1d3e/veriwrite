
try: 
    from .store_db import DATABASE_URL, merkle_tree_root
except ImportError:
    from backend.record_server.store_db import DATABASE_URL, merkle_tree_root
import pandas as pd
import psycopg

class AnalyzeDB:
    def __init__(self):
        self.d_id = None
        self.record = {
            "v": 3,
            "m": None,
            "sessions": None,
            "status": None
        }
        self.doc = None
        self.sessions = None

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
    
    def get_sessions(self, d_id: str):
        sessions = self.load_sessions()
        matched = sessions[sessions["d_id"] == d_id]
        if matched.empty:
            raise ValueError(f"sessions not found for {d_id}")
        self.sessions = matched
        return self.sessions
        

    def load_doc(self, d_id: str | None = None, title: str | None = None, author: str | None = None):
        if d_id:
            self.d_id = d_id
        elif title:
            self.d_id = self.query_title(title)
        elif author:
            self.d_id = self.query_author(author)
        else:
            return None
        self.record["m"] = None
        self.record["sessions"] = None
        self.get_doc(self.d_id)
        self.get_sessions(self.d_id)
        return self.d_id

    def set_d_id(self, d_id: str):
        self.d_id = d_id

    def get_d_id(self):
        return self.d_id

    def fetch_doc_meta(self):
        if not isinstance(self.doc, pd.Series):
            return
        m = {
            "docId": self.doc["d_id"],
            "t0": int(self.doc["t0"]),
            "tn": int(self.doc["updated_server_ts"]),
            "title": self.doc["title"],
            "author": self.doc["author"]
        }
        self.record["m"] = m
        return m

    def fetch_blocks(self, sid: str):
        blocks = self.load_blocks(sid, d_id=self.d_id)
        blocks_parsed = blocks[[
            "q",
            "ch",
            "dt0",
            "dtn",
            "ev",
            "received_server_ts",
            "valid_q",
            "valid_h",
            "valid_ch",
            "valid_dsh",
            "valid_n",
            "freshness_status",
            "receipt"
        ]].copy()
        
        blocks_parsed["status"] = self.get_blocks_status(blocks_parsed)
        # blocks_parsed = blocks_parsed.drop(
        #     columns=["valid_q", "valid_h", "valid_dsh", "valid_n", "freshness_status"]
        # )
        return blocks_parsed

    def get_blocks_status(self, blocks_parsed: pd.DataFrame):
        if blocks_parsed.empty:
            return None
        blocks_parsed = blocks_parsed.copy().sort_values(by=["q"])
        blocks_status = []
        for i in range(len(blocks_parsed)):
            block = blocks_parsed.iloc[i]
            
            valid_q = block["valid_q"]
            valid_h = block["valid_h"]
            valid_ch = block["valid_ch"]
            valid_dsh = block["valid_dsh"]
            valid_n = block["valid_n"]
            freshness_status = block["freshness_status"]
            block_status = []
            if valid_q and valid_h and valid_ch and valid_dsh and valid_n and freshness_status == "FRESH":
                block_status.append("VALID")
            if not valid_q:
                block_status.append("INVALID_Q")
            if not valid_h:
                block_status.append("INVALID_HASH_CHAIN")
            if not valid_ch:
                block_status.append("INVALID_COMMITMENT")
            if not valid_dsh:
                block_status.append("INVALID_STATE")
            if not valid_n or freshness_status != "FRESH":
                block_status.append("INVALID_FRESHNESS")
        
            blocks_status.append(block_status)

        return blocks_status

    def fetch_sessions(self):
        if not isinstance(self.sessions, pd.DataFrame) or not self.d_id:
            return
        s = []
        for i in range(len(self.sessions)):
            session = self.sessions.iloc[i]
            sid = session["sid"]
            blocks = self.fetch_blocks(sid)

            if blocks.empty:
                continue
            
            mapping = {"TRUE": True, "FALSE": False, "UNKNOWN": None}
        
            s.append({
                "sid": sid,
                "t0": int(session["st0"]),
                "tn": int(session["st0"] + session["dt"]),
                "init": session["init_text"],
                "ev": session["ev"],
                "b": blocks.drop(columns=["ch"]).to_dict(orient="records"),
                "cs": mapping.get(session["continuity_status"]),
                "mr": session["merkle_root"] == merkle_tree_root(blocks["ch"].to_list()),
                "ct": int(session["closed_server_ts"]),
                "fr": session["final_receipt"],
                "bc": int(session["block_count"]),
                "status": mapping.get(session["continuity_status"]) and session["final_receipt"] is not None
            })
        self.record["sessions"] = s
        return s            

    def get_record(self):
        if not self.d_id:
            raise ValueError("d_id is not loaded")
        if self.record["m"] is None:
            self.fetch_doc_meta()
        if self.record["status"] is None:
            self.record["status"] = self.doc["integrity_status"] or "UNVERIFIED"
        if self.record["sessions"] is None:
            self.fetch_sessions()
        return self.record
