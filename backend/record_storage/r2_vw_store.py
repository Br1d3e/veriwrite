import boto3
from typing import Any

from .vw_container import VWContainer, unwrap_vw_container

class R2Store():
    def __init__(
        self,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
        bucket_name: str,
    ):
        self.bucket_name = bucket_name
        self.client = boto3.client(
            service_name="s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name="auto",
        )

    def store_record(self, key: str, record: dict[str | Any]):
        self.store_bytes(key, VWContainer(record).wrap())

    def store_bytes(self, key: str, data: bytes) -> None:
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=data,
            ContentType="application/octet-stream",
        )
    
    def get_record(self, key: str) -> dict[str | Any]:
        return unwrap_vw_container(self.get_bytes(key))

    def get_bytes(self, key: str) -> bytes:
        obj = self.client.get_object(Bucket=self.bucket_name, Key=key)
        return obj["Body"].read()

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception:
            return False
