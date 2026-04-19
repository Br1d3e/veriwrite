"""
PostgreSQL access layer for the VeriWrite record server.

Keep FastAPI endpoint code in main.py. This module owns direct SQL interaction
and the current rolling document-state validation used during block ingest.
"""

import base64
import hashlib
import json
import os
from datetime import datetime
from typing import Any

import psycopg
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


DATABASE_URL = os.getenv(
    "VERIWRITE_DATABASE_URL",
    "postgresql://veriwrite:veriwrite@127.0.0.1:5432/veriwrite",
)
SIGNING_KEY_ID = os.getenv("VERIWRITE_SIGNING_KEY_ID", "local-dev-ed25519")
SIGNING_PRIVATE_KEY_B64 = os.getenv("VERIWRITE_ED25519_PRIVATE_KEY_B64")
_PROCESS_SIGNING_KEY = Ed25519PrivateKey.generate()


def verify_protocol(v):
    return v == 3


def connect():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def now_ms() -> int:
    return int(datetime.now().timestamp() * 1000)


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def decrypt_payload(sk_b64: str, ct_b64: str, iv_b64: str, tag_b64: str, header_text: str) -> dict[str, Any]:
    s_key = base64.b64decode(sk_b64)
    cipher_text = base64.b64decode(ct_b64)
    iv = base64.b64decode(iv_b64)
    tag = base64.b64decode(tag_b64)

    try:
        plain_text = AESGCM(s_key).decrypt(iv, cipher_text + tag, header_text.encode("utf-8"))
        return json.loads(plain_text.decode("utf-8"))
    except:
        return {}


def get_signing_key() -> Ed25519PrivateKey:
    if SIGNING_PRIVATE_KEY_B64:
        return Ed25519PrivateKey.from_private_bytes(base64.b64decode(SIGNING_PRIVATE_KEY_B64))
    return _PROCESS_SIGNING_KEY

def signing_private_key_b64_for_env() -> str:
    raw_key = _PROCESS_SIGNING_KEY.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    return base64.b64encode(raw_key).decode("ascii")


def sign_receipt(receipt_body: dict[str, Any]) -> dict[str, Any]:
    signed_receipt = {**receipt_body, "key_id": SIGNING_KEY_ID}
    signature = get_signing_key().sign(canonical_json(signed_receipt).encode("utf-8"))
    signed_receipt["sig"] = base64.b64encode(signature).decode("ascii")
    return signed_receipt


def apply_events(text: str, ev: list[Any]) -> str:
    next_text = text
    for event in ev:
        if not isinstance(event, list) or len(event) != 4:
            raise ValueError("invalid event tuple")

        _, pos, del_len, ins = event
        if not isinstance(pos, int) or not isinstance(del_len, int) or not isinstance(ins, str):
            raise ValueError("invalid event tuple")
        if pos < 0 or del_len < 0 or pos > len(next_text):
            raise ValueError("event range out of bounds")

        next_text = next_text[:pos] + ins + next_text[pos + del_len:]

    return next_text

def merkle_tree_root(block_hashes: list[str]) -> str | None:
    if not block_hashes:
        return None
    if len(block_hashes) == 1:
        return block_hashes[0]

    level = block_hashes[:]
    if len(level) % 2 == 1:
        level.append(level[-1])

    next_level = []
    for i in range(0, len(level), 2):
        left = bytes.fromhex(level[i])
        right = bytes.fromhex(level[i + 1])
        next_level.append(hashlib.sha256(left + right).hexdigest())

    return merkle_tree_root(next_level)


def start_doc(doc: dict[str, Any]) -> dict[str, Any]:
    d_id = doc.get("dId")
    v = doc.get("v")
    if not verify_protocol(v):
        return {"status": "INVALID PROTOCOL", "op": "doc/start", "dId": d_id}

    t0 = doc.get("t0")
    title = doc.get("ttl")
    author = doc.get("a")
    server_ts = now_ms()

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO docs (d_id, v, t0, title, author, created_server_ts, updated_server_ts)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (d_id) DO UPDATE
                SET t0 = EXCLUDED.t0,
                    title = EXCLUDED.title,
                    author = EXCLUDED.author,
                    updated_server_ts = EXCLUDED.updated_server_ts
                """,
                (d_id, v, t0, title, author, server_ts, server_ts),
            )

    return {"status": "SUCCESS", "op": "doc/start", "dId": d_id}


def start_session(session: dict[str, Any]) -> dict[str, Any]:
    d_id = session.get("dId")
    sid = session.get("sid")
    v = session.get("v")
    if not verify_protocol(v):
        return {"status": "INVALID PROTOCOL", "op": "session/start", "sid": sid}

    st0 = session.get("st0")
    s_key = session.get("sk")
    init_text = session.get("it")
    init_hash = session.get("ih")
    server_ts = now_ms()

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT eh
                FROM sessions
                WHERE d_id = %s AND eh IS NOT NULL
                ORDER BY st0 DESC
                LIMIT 1
                """,
                (d_id,),
            )
            previous_session = cursor.fetchone()
            prev_end_hash = previous_session["eh"] if previous_session else None
            continuity_status = "UNKNOWN"
            if prev_end_hash:
                continuity_status = "TRUE" if prev_end_hash == init_hash else "FALSE"
            else:
                continuity_status = "TRUE"  # true if first session

            cursor.execute(
                """
                INSERT INTO sessions (
                    d_id, sid, v, st0, session_key_b64, init_text,
                    current_text, current_dsh, ih, continuity_status, created_server_ts
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    d_id,
                    sid,
                    v,
                    st0,
                    s_key,
                    init_text,
                    init_text,
                    init_hash,
                    init_hash,
                    continuity_status,
                    server_ts,
                ),
            )
            cursor.execute(
                "UPDATE docs SET updated_server_ts = %s WHERE d_id = %s",
                (server_ts, d_id),
            )

    return {"status": "SUCCESS", "op": "session/start", "sid": sid}


def append_block(block: dict[str, Any]) -> dict[str, Any]:
    header = block.get("header") or {}
    v = header.get("v")
    d_id = header.get("dId")
    sid = header.get("sid")
    q = header.get("q")
    ph = header.get("ph")
    iv = block.get("iv")
    cipher_text = block.get("ct")
    tag = block.get("tag")
    current_hash = block.get("ch")
    if not verify_protocol(v):
        return {"status": "INVALID PROTOCOL", "op": "session/block", "sid": sid, "q": q}

    server_ts = now_ms()
    header_text = canonical_json(header)

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM sessions WHERE d_id = %s AND sid = %s FOR UPDATE",
                (d_id, sid),
            )
            session = cursor.fetchone()
            if not session:
                return {"status": "SESSION NOT FOUND", "op": "session/block", "sid": sid, "q": q}

            cursor.execute(
                """
                SELECT q, ch
                FROM blocks
                WHERE d_id = %s AND sid = %s
                ORDER BY q DESC
                LIMIT 1
                """,
                (d_id, sid),
            )
            previous_block = cursor.fetchone()
            if previous_block:
                valid_q = q == previous_block["q"] + 1
                valid_ch = ph == previous_block["ch"]
            else:
                valid_q = q == 0
                valid_ch = ph is None

            payload = decrypt_payload(session["session_key_b64"], cipher_text, iv, tag, header_text)
            if payload == {}:
                return {"status": "INVALID AEED TAG", "op": "session/block", "sid": sid, "q": q}
            dt0 = payload.get("dt0")
            dtn = payload.get("dtn")
            init_dsh = payload.get("idsh")
            doc_state_hash = payload.get("dsh")
            ev = payload.get("ev")
            if not isinstance(ev, list):
                return {"status": "INVALID EV", "op": "session/block", "sid": sid, "q": q}
            if not init_dsh or not doc_state_hash:
                return {"status": "INVALID DOC STATE HASH", "op": "session/block", "sid": sid, "q": q}

            current_text = session["current_text"] if session["current_text"] is not None else session["init_text"]
            current_dsh = session["current_dsh"] if session["current_dsh"] is not None else session["ih"]
            if current_text is None:
                return {"status": "MISSING CURRENT TEXT", "op": "session/block", "sid": sid, "q": q}

            try:
                next_text = apply_events(current_text, ev)
            except ValueError:
                return {"status": "INVALID EV", "op": "session/block", "sid": sid, "q": q}

            expected_dsh = sha256_hex(next_text)
            valid_dsh = init_dsh == current_dsh and doc_state_hash == expected_dsh

            if not (valid_q and valid_ch and valid_dsh):
                return {
                    "status": "INVALID BLOCK",
                    "op": "session/block",
                    "sid": sid,
                    "q": q,
                    "valid_q": valid_q,
                    "valid_h": valid_ch,
                    "valid_dsh": valid_dsh,
                }

            session_ev = session["ev"] or []
            if not isinstance(session_ev, list):
                session_ev = []
            session_ev.extend(ev)

            receipt = sign_receipt(
                {
                    "type": "block_receipt",
                    "v": v,
                    "dId": d_id,
                    "sid": sid,
                    "q": q,
                    "ch": current_hash,
                    "dsh": doc_state_hash,
                    "valid_q": valid_q,
                    "valid_h": valid_ch,
                    "valid_dsh": valid_dsh,
                    "server_ts": server_ts,
                }
            )

            cursor.execute(
                """
                INSERT INTO blocks (
                    d_id, sid, q, ph, iv_b64, ct_b64, tag_b64, ch,
                    dt0, dtn, init_dsh, dsh, ev, receipt,
                    received_server_ts, valid_q, valid_h, valid_dsh
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s
                )
                """,
                (
                    d_id,
                    sid,
                    q,
                    ph,
                    iv,
                    cipher_text,
                    tag,
                    current_hash,
                    dt0,
                    dtn,
                    init_dsh,
                    doc_state_hash,
                    Jsonb(ev),
                    Jsonb(receipt),
                    server_ts,
                    valid_q,
                    valid_ch,
                    valid_dsh,
                ),
            )
            cursor.execute(
                """
                UPDATE sessions
                SET block_count = (
                        SELECT COUNT(*) FROM blocks WHERE d_id = %s AND sid = %s
                    ),
                    ev = %s,
                    current_text = %s,
                    current_dsh = %s
                WHERE d_id = %s AND sid = %s
                """,
                (d_id, sid, Jsonb(session_ev), next_text, doc_state_hash, d_id, sid),
            )

    return {
        "status": "SUCCESS",
        "op": "session/block",
        "sid": sid,
        "q": q,
        "valid_q": valid_q,
        "valid_h": valid_ch,
        "valid_dsh": valid_dsh,
        "receipt": receipt
    }


def end_session(session_end: dict[str, Any]) -> dict[str, Any]:
    d_id = session_end.get("dId")
    sid = session_end.get("sid")
    v = session_end.get("v")
    if not verify_protocol(v):
        return {"status": "INVALID PROTOCOL", "op": "session/end", "sid": sid}

    dt = session_end.get("dt")  # ?
    end_hash = session_end.get("eh")

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM sessions
                WHERE d_id = %s AND sid = %s
                FOR UPDATE
                """,
                (d_id, sid),
            )
            session = cursor.fetchone()
            if not session:
                return {"status": "SESSION NOT FOUND", "op": "session/end", "sid": sid}

            continuity_status = session["continuity_status"] or "UNKNOWN"
            valid_continuity = continuity_status == "TRUE"
            valid_end_hash = end_hash == session["current_dsh"]
            if valid_continuity and valid_end_hash:
                session_status = "SUCCESS"
            elif not valid_continuity and not valid_end_hash:
                session_status = "INVALID CONTINUITY AND END HASH"
            elif not valid_continuity:
                session_status = "INVALID CONTINUITY STATUS"
            else:
                session_status = "INVALID END HASH"

            init_hash = session["ih"]
            closed_server_ts = now_ms()

            cursor.execute(
                """
                SELECT ch
                FROM blocks
                WHERE d_id = %s AND sid = %s
                ORDER BY q ASC
                """,
                (d_id, sid)
            )
            blocks = cursor.fetchall()
            block_hashes = [block["ch"] for block in blocks]
            merkle_root = merkle_tree_root(block_hashes)
            last_block_hash = block_hashes[-1] if block_hashes else None

            final_receipt = sign_receipt({
                "type": "session_receipt",
                "v": v,
                "dId": d_id,
                "sid": sid,
                "ih": init_hash,
                "eh": end_hash,
                "current_dsh": session["current_dsh"],
                "continuity_status": continuity_status,
                "valid_continuity": valid_continuity,
                "valid_end_hash": valid_end_hash,
                "session_status": session_status,
                "last_ch": last_block_hash,
                "merkle_root": merkle_root,
                "block_count": len(block_hashes),
                "closed_server_ts": closed_server_ts
            })

            cursor.execute(
                """
                UPDATE sessions 
                SET eh = %s,
                    dt = %s,
                    merkle_root = %s,
                    final_receipt = %s,
                    closed_server_ts = %s
                WHERE d_id = %s AND sid = %s
                """,
                (end_hash, 
                 dt,
                 merkle_root,
                 Jsonb(final_receipt), 
                 closed_server_ts, 
                 d_id, 
                 sid)
            )

    return {
        "status": session_status,
        "op": "session/end", 
        "sid": sid,
        "receipt": final_receipt
    }
