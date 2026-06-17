"""
Cryptography helpers for store_db and analyze_db
"""


import os
import hashlib
import base64
import binascii
import uuid
import json
from typing import Any
import canonicaljson

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, PublicFormat, NoEncryption
from cryptography.exceptions import InvalidSignature


SIGNING_KEY_ID = os.getenv("VERIWRITE_SIGNING_KEY_ID", "local-dev-ed25519")
SIGNING_PRIVATE_KEY_B64 = os.getenv("VERIWRITE_ED25519_PRIVATE_KEY_B64")
_PROCESS_SIGNING_KEY = Ed25519PrivateKey.generate()


def sha256_hex(value: str | bytes) -> str:
    if isinstance(value, str):
        value = value.encode("utf-8")
    return hashlib.sha256(value).hexdigest()

def gen_uuid() -> str:
    return str(uuid.uuid4())

def decrypt_payload(sk_b64: str, ct_b64: str, iv_b64: str, tag_b64: str, aad: str | bytes) -> dict[str, Any]:
    s_key = base64.b64decode(sk_b64)
    cipher_text = base64.b64decode(ct_b64)
    iv = base64.b64decode(iv_b64)
    tag = base64.b64decode(tag_b64)
    aad_bytes = aad.encode("utf-8") if isinstance(aad, str) else aad

    try:
        plain_text = AESGCM(s_key).decrypt(iv, cipher_text + tag, aad_bytes)
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

def get_verify_key() -> Ed25519PublicKey:
    return get_signing_key().public_key()

def sign_receipt(receipt_body: dict[str, Any]) -> dict[str, Any]:
    signed_receipt = {**receipt_body, "key_id": SIGNING_KEY_ID}
    signature = get_signing_key().sign(canonicaljson.encode_canonical_json(signed_receipt))
    signed_receipt["sig"] = base64.b64encode(signature).decode("ascii")
    return signed_receipt

def verify_signature(receipt: dict[str, Any]) -> bool:
    signature = receipt.get("sig")
    if not isinstance(signature, str):
        return False

    signed_receipt = {key: value for key, value in receipt.items() if key != "sig"}
    try:
        get_verify_key().verify(
            base64.b64decode(signature),
            canonicaljson.encode_canonical_json(signed_receipt),
        )
        return True
    except (InvalidSignature, ValueError, TypeError, binascii.Error):
        return False

def get_ecdh_keys() -> tuple[ec.EllipticCurvePrivateKey, ec.EllipticCurvePublicKey]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    return (private_key, public_key)

def exchange_session_key(c_pub_b64: Any, salt: bytes, info: dict) -> dict[str, Any]:
    c_pub_bytes = base64.b64decode(c_pub_b64)
    c_pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), c_pub_bytes)

    private_key, public_key = get_ecdh_keys()
    raw_key = public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    shared = private_key.exchange(ec.ECDH(), c_pub)
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=canonicaljson.encode_canonical_json(info),
    )
    session_key = hkdf.derive(shared)

    return {
        "s_pub": base64.b64encode(raw_key).decode("ascii"),
        "s_key": base64.b64encode(session_key).decode("ascii"),
    }


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
