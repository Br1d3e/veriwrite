import os

from .local_vw_store import LocalVWStore
from .r2_vw_store import R2Store


VW_STORE_MODE = os.getenv("VERIWRITE_STORAGE_BACKEND", "local")

def get_vw_store():
    if VW_STORE_MODE == "local":
        return LocalVWStore(base_path=os.getenv("VERIWRITE_VW_STORE_PATH", "backend/record_storage/.vw"))
    elif VW_STORE_MODE == "r2":
        return R2Store(
            endpoint_url=os.environ["R2_ENDPOINT_URL"],
            access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            bucket_name=os.environ["R2_BUCKET_NAME"],
        )
