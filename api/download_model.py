"""
Download model weights at Docker build time into /app/model so the container
does not need the Hugging Face Hub at runtime.
"""

import os

from huggingface_hub import snapshot_download

MODEL_ID = os.environ.get(
    "MODEL_ID", "sugatobagchi/smolified-news-bias-detector"
)
OUT_DIR = os.environ.get("MODEL_PATH", "/app/model")


def main() -> None:
    snapshot_download(
        repo_id=MODEL_ID,
        local_dir=OUT_DIR,
        local_dir_use_symlinks=False,
    )
    print(f"Downloaded {MODEL_ID} -> {OUT_DIR}")


if __name__ == "__main__":
    main()
