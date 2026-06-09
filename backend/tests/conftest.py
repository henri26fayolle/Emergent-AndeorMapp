"""Shared local test configuration."""
import os
from pathlib import Path


def _parse_env_file(path: Path) -> dict:
    values = {}
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        values[key.strip()] = value
    return values


_backend_env = _parse_env_file(Path(__file__).resolve().parents[1] / ".env")

for _key, _value in _backend_env.items():
    os.environ.setdefault(_key, _value)

os.environ.setdefault("REACT_APP_BACKEND_URL", "http://127.0.0.1:8010")
