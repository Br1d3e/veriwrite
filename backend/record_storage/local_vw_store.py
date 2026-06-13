from pathlib import Path
from typing import Any

from .vw_container import VWContainer, unwrap_vw_container

class LocalVWStore:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)

    def store_record(self, key: str, record: dict[str | Any]):
        self.store_bytes(key, VWContainer(record).wrap())

    def store_bytes(self, key: str, data: bytes):
        file_path = (self.base_path / key).with_suffix(".vw")
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(data)
    
    def get_record(self, key: str) -> dict[str | Any]:
        return unwrap_vw_container(self.get_bytes(key))
    
    def get_bytes(self, key: str) -> bytes:
        file_path = (self.base_path / key).with_suffix(".vw")
        if not file_path.exists():
            raise FileNotFoundError(f"Storage key {key} not found in local VW store")
        with open(file_path, "rb") as f:
            return f.read()
    
    def exists(self, key: str) -> bool:
        file_path = (self.base_path / key).with_suffix(".vw")
        return file_path.exists()
