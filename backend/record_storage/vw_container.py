import hashlib
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

import msgpack


MAGIC = b"VWFR"
VERSION = 1
CODEC_ID_MSGPACK = 1
HASH_SIZE = 32
HEADER_SIZE = len(MAGIC) + 1 + 1 + 1
RECORD_START = HEADER_SIZE + HASH_SIZE


def serialize_record(flight_record: Mapping[str, Any]) -> bytes:
    return msgpack.packb(_coerce_js_numbers(flight_record), use_bin_type=True)


def deserialize_record(payload: bytes | bytearray | memoryview) -> dict[str, Any]:
    record = msgpack.unpackb(bytes(payload), raw=False, strict_map_key=False)
    if not isinstance(record, dict):
        raise ValueError("flight record payload did not decode to an object")
    return _normalize_js_numbers(record)


def wrap_vw_container(flight_record: Mapping[str, Any]) -> bytes:
    payload = serialize_record(flight_record)
    digest = hashlib.sha256(payload).digest()
    return MAGIC + bytes([VERSION, CODEC_ID_MSGPACK, RECORD_START]) + digest + payload


def is_vw_container(data: bytes | bytearray | memoryview) -> bool:
    raw = bytes(data)
    return (
        len(raw) > RECORD_START
        and raw[:4] == MAGIC
        and raw[4] == VERSION
        and raw[5] == CODEC_ID_MSGPACK
        and raw[6] == RECORD_START
    )


def verify_container_hash(data: bytes | bytearray | memoryview) -> bool:
    raw = _validate_container(data)
    expected = raw[HEADER_SIZE:RECORD_START]
    payload = raw[RECORD_START:]
    return hashlib.sha256(payload).digest() == expected


def unwrap_vw_container(data: bytes | bytearray | memoryview, *, verify_hash: bool = True) -> dict[str, Any]:
    raw = _validate_container(data)
    if verify_hash and not verify_container_hash(raw):
        raise ValueError("flight record hash mismatch")
    return deserialize_record(raw[RECORD_START:])


@dataclass(frozen=True)
class VWContainer:
    record: Mapping[str, Any]

    def serialize_record(self) -> bytes:
        return serialize_record(self.record)

    def wrap(self) -> bytes:
        return wrap_vw_container(self.record)

    @classmethod
    def unwrap(cls, data: bytes | bytearray | memoryview, *, verify_hash: bool = True) -> "VWContainer":
        return unwrap_vw_container(data, verify_hash=verify_hash)


def _validate_container(data: bytes | bytearray | memoryview) -> bytes:
    raw = bytes(data)
    if len(raw) <= RECORD_START:
        raise ValueError("VW container is too short")
    if raw[:4] != MAGIC:
        raise ValueError("invalid VW container magic bytes")
    if raw[4] != VERSION:
        raise ValueError(f"unsupported VW container version: {raw[4]}")
    if raw[5] != CODEC_ID_MSGPACK:
        raise ValueError(f"unsupported VW container codec id: {raw[5]}")
    if raw[6] != RECORD_START:
        raise ValueError(f"unsupported VW container record offset: {raw[6]}")
    return raw


def _coerce_js_numbers(value: Any) -> Any:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and not (-0x80000000 <= value <= 0xFFFFFFFF):
        return float(value)
    if isinstance(value, Mapping):
        return {key: _coerce_js_numbers(item) for key, item in value.items()}
    if _is_sequence(value):
        return [_coerce_js_numbers(item) for item in value]
    return value


def _normalize_js_numbers(value: Any) -> Any:
    if isinstance(value, float) and value.is_integer() and abs(value) <= 9007199254740991:
        return int(value)
    if isinstance(value, Mapping):
        return {key: _normalize_js_numbers(item) for key, item in value.items()}
    if _is_sequence(value):
        return [_normalize_js_numbers(item) for item in value]
    return value


def _is_sequence(value: Any) -> bool:
    return isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray, memoryview))
