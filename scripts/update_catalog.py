#!/usr/bin/env python3
"""Incrementally collect open-source tools from GitHub's public Search API.

The script is intentionally deterministic: each item points to its upstream
repository, only public non-fork/non-archived projects with a recognized
license are accepted, and a cursor prevents duplicate or repeated batches.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "catalog.generated.json"
STATE_PATH = ROOT / "catalog-progress.json"
JS_PATH = ROOT / "free-products.generated.js"
SEED_PATH = ROOT / "free-products.js"
API = "https://api.github.com/search/repositories"
MAX_PAGES_PER_TOPIC = 10

# One topic corresponds to a visible category in the public catalog.
SOURCES = [
    ("developer-tools", "DEV", "Programação e ferramentas"),
    ("code-editor", "DEV", "Editores de código"),
    ("web-development", "DEV", "Web e desenvolvimento"),
    ("design-tools", "DESIGN", "Design gráfico"),
    ("image-editing", "DESIGN", "Imagem e fotografia"),
    ("video-editor", "VIDEO", "Vídeo e animação"),
    ("audio", "AUDIO", "Áudio e música"),
    ("productivity", "OFFICE", "Produtividade"),
    ("cybersecurity", "SECURITY", "Segurança digital"),
    ("self-hosted", "APPS", "Aplicações e nuvem"),
    ("education", "LEARN", "Educação e aprendizagem"),
    ("artificial-intelligence", "AI", "Inteligência artificial"),
    ("machine-learning", "AI", "IA e dados"),
    ("social-media", "SOCIAL", "Redes sociais"),
    ("ecommerce", "BUSINESS", "Comércio e negócios"),
    ("finance", "FINANCE", "Finanças"),
    ("open-source", "APPS", "Software livre"),
    ("linux", "APPS", "Ferramentas para Linux"),
]


def token() -> str:
    value = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if value:
        return value.strip()
    try:
        return subprocess.check_output(["gh", "auth", "token"], text=True).strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        return ""


def get_json(url: str, auth_token: str) -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "World69-Catalog/1.0",
    }
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=25) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in (403, 429):
                retry_after = int(exc.headers.get("Retry-After", "10"))
                reset_at = exc.headers.get("X-RateLimit-Reset")
                delay = min(max(retry_after, 5), 60)
                if reset_at:
                    delay = min(max(int(reset_at) - int(time.time()) + 2, 5), 60)
                print(f"API limit reached; waiting {delay}s before retry", file=sys.stderr)
                time.sleep(delay)
            elif exc.code >= 500:
                time.sleep(2 ** attempt)
            else:
                raise
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"GitHub API request failed after retries: {last_error}")


def normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def read_existing_ids() -> tuple[set[str], set[str]]:
    ids: set[str] = set()
    names: set[str] = set()
    if DATA_PATH.exists():
        try:
            for item in json.loads(DATA_PATH.read_text(encoding="utf-8")):
                if item.get("id"):
                    ids.add(str(item["id"]).lower())
                if item.get("name"):
                    names.add(normalized_name(str(item["name"])))
        except (json.JSONDecodeError, TypeError):
            raise RuntimeError(f"Invalid JSON in {DATA_PATH}")
    if SEED_PATH.exists():
        seed = SEED_PATH.read_text(encoding="utf-8")
        ids.update(re.findall(r"\bid\s*:\s*['\"]([^'\"]+)['\"]", seed))
        names.update(normalized_name(name) for name in re.findall(r"\bname\s*:\s*['\"]([^'\"]+)['\"]", seed))
    return ids, names


def load_items() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    value = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise RuntimeError("catalog.generated.json must contain a JSON array")
    return value


def source_key(topic: str) -> str:
    return topic


def make_product(repo: dict, category: str, label: str) -> dict | None:
    if repo.get("fork") or repo.get("archived") or not repo.get("full_name"):
        return None
    if not (repo.get("description") or "").strip():
        return None
    license_info = repo.get("license") or {}
    spdx = license_info.get("spdx_id")
    if not spdx or spdx in {"NOASSERTION", "Other"}:
        return None
    html_url = repo.get("html_url") or ""
    homepage = (repo.get("homepage") or "").strip()
    if not homepage.startswith(("https://", "http://")):
        homepage = html_url
    owner = repo.get("owner") or {}
    avatar = owner.get("avatar_url") or ""
    description = re.sub(r"\s+", " ", repo["description"]).strip()
    if len(description) > 260:
        description = description[:257].rsplit(" ", 1)[0] + "…"
    repo_name = repo["full_name"].split("/", 1)[-1].replace("-", " ").replace("_", " ")
    pretty_name = re.sub(r"\s+", " ", repo_name).strip()
    stars = int(repo.get("stargazers_count") or 0)
    return {
        "id": f"github:{repo['full_name'].lower()}",
        "name": pretty_name,
        "category": category,
        "categoryLabel": label,
        "description": description,
        "link": homepage,
        "image": avatar,
        "source": html_url,
        "license": f"Open source · {spdx}",
        "type": "free",
        "sourceType": "GitHub",
        "stars": stars,
    }


def save(items: list[dict], state: dict) -> None:
    DATA_PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    JS_PATH.write_text(
        "// Generated by scripts/update_catalog.py. Do not edit by hand.\n"
        "export const generatedProducts = "
        + json.dumps(items, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def collect(batch_size: int, target_total: int, per_source: int) -> int:
    items = load_items()
    existing, existing_names = read_existing_ids()
    current_total = len(existing)
    if current_total >= target_total:
        print(f"Target already reached: {current_total}/{target_total}")
        return 0

    if STATE_PATH.exists():
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    else:
        state = {"next_source": 0, "sources": {}, "runs": 0}
    state.setdefault("next_source", 0)
    state.setdefault("sources", {})
    added: list[dict] = []
    auth_token = token()
    api_calls = 0
    empty_rounds = 0
    max_calls = min(150, max(24, len(SOURCES) * 6))

    while len(added) < batch_size and current_total + len(added) < target_total and api_calls < max_calls:
        idx = int(state["next_source"]) % len(SOURCES)
        topic, category, label = SOURCES[idx]
        state["next_source"] = (idx + 1) % len(SOURCES)
        cursor = state["sources"].setdefault(source_key(topic), {"page": 1, "offset": 0})
        page = int(cursor.get("page", 1))
        offset = int(cursor.get("offset", 0))
        if page > MAX_PAGES_PER_TOPIC:
            empty_rounds += 1
            if empty_rounds >= len(SOURCES):
                break
            continue

        query = urllib.parse.urlencode({
            "q": f"topic:{topic} stars:>=20 archived:false fork:false",
            "sort": "stars",
            "order": "desc",
            "per_page": 100,
            "page": page,
        })
        payload = get_json(f"{API}?{query}", auth_token)
        api_calls += 1
        results = payload.get("items") or []
        request_added = 0
        index = offset
        while index < len(results) and request_added < per_source:
            repo = results[index]
            index += 1
            product = make_product(repo, category, label)
            name_key = normalized_name(product["name"]) if product else ""
            if not product or product["id"].lower() in existing or name_key in existing_names:
                continue
            existing.add(product["id"].lower())
            existing_names.add(name_key)
            added.append(product)
            request_added += 1
            if len(added) >= batch_size or current_total + len(added) >= target_total:
                break

        if index >= len(results):
            cursor["page"] = page + 1
            cursor["offset"] = 0
        else:
            cursor["page"] = page
            cursor["offset"] = index
        if not results or page >= MAX_PAGES_PER_TOPIC:
            cursor["page"] = MAX_PAGES_PER_TOPIC + 1
            cursor["offset"] = 0
        empty_rounds = empty_rounds + 1 if request_added == 0 else 0
        # Exit only if every source is exhausted; one empty topic is normal.
        if empty_rounds >= len(SOURCES) and all(
            int(state["sources"].get(t, {}).get("page", 1)) > MAX_PAGES_PER_TOPIC for t, _, _ in SOURCES
        ):
            break

    items.extend(added)
    state["runs"] = int(state.get("runs", 0)) + 1
    state["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save(items, state)
    print(f"Added {len(added)} products; catalog total {current_total + len(added)}/{target_total}; API calls: {api_calls}")
    if len(added) < batch_size:
        print("Fewer new products were available in the queried source pages; the next run will continue from saved cursors.")
    return len(added)


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch-size", type=int, default=40)
    parser.add_argument("--target", type=int, default=100000)
    parser.add_argument("--per-source", type=int, default=4)
    args = parser.parse_args()
    if args.batch_size < 1 or args.target < 1 or args.per_source < 1:
        parser.error("batch-size, target and per-source must be positive")
    try:
        collect(args.batch_size, args.target, args.per_source)
    except Exception as exc:
        print(f"Catalog update failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
