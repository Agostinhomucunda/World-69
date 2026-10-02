#!/usr/bin/env python3
"""Collect permitted public opportunities for World 69 Radar.

All external text is treated as untrusted data. The collector stores short plain-text
summaries, stable source identifiers and original URLs; it never scrapes HTML pages.
"""
from __future__ import annotations

import argparse
import email.utils
import hashlib
import html
from html.parser import HTMLParser
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "radar.generated.json"
DEFAULT_DETAILS_OUTPUT = ROOT / "radar-details.generated.json"
USER_AGENT = "World69-Radar/1.0 (+https://world69online.netlify.app/radar.html)"
AGL_ANGOLA_FEED_URL = "https://acareerbyagl.talent-soft.com/handlers/offerRss.ashx?LCID=1033&Rss_JobCountry=37"
MAX_DESCRIPTION = 2400
MAX_SUMMARY = 420


@dataclass(frozen=True)
class OpportunitySource:
    id: str
    name: str
    kind: str
    method: str
    countries: tuple[str, ...]
    categories: tuple[str, ...]
    frequency_minutes: int
    limit: int
    note: str = ""


SOURCE_REGISTRY = [
    OpportunitySource("jobicy", "Jobicy", "jobs", "public JSON API", ("Remoto/Global",), ("employment", "freelance", "remote"), 60, 100, "Fonte remota; consultar no máximo uma vez por hora."),
    OpportunitySource("remoteok", "Remote OK", "jobs", "public JSON API", ("Remoto/Global",), ("employment", "freelance", "remote"), 60, 250, "Atribuição e link dofollow para cada anúncio original."),
    OpportunitySource("weworkremotely", "We Work Remotely", "jobs", "public RSS", ("Remoto/Global",), ("employment", "remote"), 60, 100, "Preservar a atribuição e o link do feed original."),
    OpportunitySource("agl_angola", "AGL Angola Careers", "jobs", "official RSS by country", ("Angola",), ("employment", "internship"), 60, 50, "Feed RSS oficial do portal de carreiras AGL, filtrada para Angola; manter o link original."),
    OpportunitySource("github", "GitHub Issues", "open_source", "official REST API", (), ("projects", "programming", "websites", "applications", "cybersecurity"), 60, 180, "Issues abertas com labels de contribuição; remuneração não presumida."),
    OpportunitySource("bluesky", "Bluesky", "social", "public AppView API", ("Todos os países",), ("social", "projects", "freelance", "employment"), 60, 120, "Pistas comunitárias não verificadas; conteúdo curto e sem perfil pessoal."),
    OpportunitySource("reliefweb", "ReliefWeb", "jobs_training", "official API v2", (), ("employment", "teaching", "internship"), 60, 100, "Requer appname pré-aprovado; não republicar corpo extenso de parceiros."),
    OpportunitySource("greenhouse", "Greenhouse boards", "jobs", "official job-board API", (), ("employment", "internship"), 60, 100, "Apenas boards de carreiras oficiais configurados pelo proprietário."),
    OpportunitySource("usajobs", "USAJOBS", "jobs", "official API", ("Estados Unidos",), ("employment", "internship"), 60, 100, "Requer API key e User-Agent configurados em secrets."),
    OpportunitySource("arbeitnow", "Arbeitnow", "jobs", "public JSON API", ("Europa",), ("employment", "internship"), 60, 100, "Termos de republicação por confirmar; não ativada."),
]

COUNTRY_ALIASES = {
    "angola": "Angola", "ao": "Angola", "brasil": "Brasil", "brazil": "Brasil", "br": "Brasil",
    "portugal": "Portugal", "pt": "Portugal", "mozambique": "Moçambique", "moçambique": "Moçambique", "mz": "Moçambique",
    "south africa": "África do Sul", "south-africa": "África do Sul", "áfrica do sul": "África do Sul", "za": "África do Sul",
    "cabo verde": "Cabo Verde", "cape verde": "Cabo Verde", "cv": "Cabo Verde",
    "united states": "Estados Unidos", "usa": "Estados Unidos", "u.s.": "Estados Unidos", "us": "Estados Unidos", "estados unidos": "Estados Unidos",
    "united kingdom": "Reino Unido", "uk": "Reino Unido", "great britain": "Reino Unido", "reino unido": "Reino Unido",
    "canada": "Canadá", "canadá": "Canadá", "ca": "Canadá",
    "worldwide": "Remoto/Global", "anywhere": "Remoto/Global", "global": "Remoto/Global", "remote": "Remoto/Global",
    "anywhere in the world": "Remoto/Global", "worldwide (remote)": "Remoto/Global",
    "germany": "Alemanha", "de": "Alemanha", "philippines": "Filipinas", "ph": "Filipinas",
    "spain": "Espanha", "es": "Espanha", "mexico": "México", "mx": "México",
    "poland": "Polónia", "pl": "Polónia", "singapore": "Singapura", "sg": "Singapura",
    "china": "China", "cn": "China", "france": "França", "fr": "França",
    "argentina": "Argentina", "ar": "Argentina", "australia": "Austrália", "au": "Austrália",
    "japan": "Japão", "jp": "Japão", "ireland": "Irlanda", "ie": "Irlanda",
    "netherlands": "Países Baixos", "the netherlands": "Países Baixos", "nl": "Países Baixos",
    "hong kong": "Hong Kong", "hungary": "Hungria", "hu": "Hungria", "norway": "Noruega", "no": "Noruega",
    "sweden": "Suécia", "se": "Suécia", "new zealand": "Nova Zelândia", "nz": "Nova Zelândia",
    "south korea": "Coreia do Sul", "korea": "Coreia do Sul", "kr": "Coreia do Sul",
}

CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("programming", ("programming", "programmer", "developer", "software engineer", "coding", "python", "javascript", "java", "c++", "typescript", "backend", "back-end", "frontend", "front-end", "devops")),
    ("websites", ("website", "web site", "web developer", "web development", "wordpress", "landing page", "shopify", "web design")),
    ("applications", ("mobile app", "application developer", "ios", "android", "react native", "flutter", "app development")),
    ("ai", ("artificial intelligence", "machine learning", "deep learning", " llm", " ai ", "generative ai", "inteligência artificial", "inteligencia artificial")),
    ("cybersecurity", ("cybersecurity", "cyber security", "infosec", "security engineer", "penetration test", "pentest", "ethical hacking", "cibersegurança", "ciberseguranca")),
    ("design", ("designer", "graphic design", "ui/ux", "ux designer", "ui designer", "figma", "visual design", "design gráfico", "design grafico")),
    ("video", ("video editor", "videographer", "video production", "motion graphics", "edição de vídeo", "edicao de video")),
    ("audio", ("audio engineer", "sound design", "podcast editor", "music producer", "audio editing")),
    ("social", ("social media", "community manager", "content creator", "influencer", "redes sociais")),
    ("teaching", ("teacher", "tutor", "teaching", "instructor", "mentor", "training", "educator", "professor", "tutoria", "formação", "formacao")),
    ("internship", ("internship", "intern ", "intern-", "estágio", "estagio", "graduate program", "early career")),
    ("freelance", ("freelance", "freelancer", "contractor", "contract role", "independent contractor", "gig", "freelancer")),
    ("projects", ("open source", "open-source", "good first issue", "help wanted", "bounty", "project", "projeto", "collaboration", "contribution")),
    ("employment", ("job", "career", "employment", "hiring", "vacancy", "position", "full-time", "part-time", "emprego", "vaga")),
]


class PlainTextParser(HTMLParser):
    def __init__(self, preserve_blocks: bool = False) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.blocked = 0
        self.block_separator = "\n" if preserve_blocks else " "

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "iframe", "svg"}:
            self.blocked += 1
        elif tag.lower() in {"p", "br", "div", "li", "h1", "h2", "h3", "tr"} and not self.blocked:
            self.parts.append(self.block_separator)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "iframe", "svg"} and self.blocked:
            self.blocked -= 1
        elif tag.lower() in {"p", "div", "li", "h1", "h2", "h3", "tr"} and not self.blocked:
            self.parts.append(self.block_separator)

    def handle_data(self, data: str) -> None:
        if not self.blocked:
            self.parts.append(data)


def clean_text(value: Any, limit: int = MAX_DESCRIPTION, *, preserve_blocks: bool = False) -> str:
    if value is None:
        return ""
    raw = html.unescape(str(value))
    parser = PlainTextParser(preserve_blocks=preserve_blocks)
    try:
        parser.feed(raw)
        text = " ".join(parser.parts)
    except Exception:
        text = raw
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"https?://\S+|www\.\S+", " ", text, flags=re.I)
    text = re.sub(r"[\w.!#$%&'*+/=?^_`{|}~-]+@[\w.-]+\.[\w-]+", " ", text, flags=re.I)
    text = re.sub(r"(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)", " ", text)
    text = re.sub(r"(?<!\w)@[A-Za-z0-9_.-]{2,40}\b", " ", text)
    cleaned_lines = []
    for line in re.split(r"[\r\n]+", text):
        if re.search(r"\b(email|e-mail|phone|telephone|whatsapp|contact details|contact me at|contacto|telefone|telemóvel)\b", line, re.I):
            continue
        cleaned_lines.append(line.strip())
    separator = "\n" if preserve_blocks else " "
    text = re.sub(r"[>*_`#~]+", " ", separator.join(cleaned_lines))
    if preserve_blocks:
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"[ \t]*\n[ \t]*", "\n", text)
        text = re.sub(r"\n{2,}", "\n", text).strip()
    else:
        text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0].rstrip(" .,:;—-") + "…"
    return text


def safe_https_url(value: Any) -> str:
    if not value:
        return ""
    try:
        parsed = urllib.parse.urlsplit(str(value).strip())
    except ValueError:
        return ""
    if parsed.scheme.lower() != "https" or not parsed.netloc or parsed.username or parsed.password:
        return ""
    if parsed.hostname is None or any(ch.isspace() for ch in parsed.netloc):
        return ""
    return urllib.parse.urlunsplit(("https", parsed.netloc, parsed.path, parsed.query, ""))


def parse_datetime(value: Any) -> str | None:
    if value in (None, ""):
        return None
    try:
        if isinstance(value, (int, float)) or (isinstance(value, str) and value.isdigit()):
            stamp = float(value)
            if stamp > 10_000_000_000:
                stamp /= 1000
            return datetime.fromtimestamp(stamp, timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        text = str(value).strip()
        try:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            dt = email.utils.parsedate_to_datetime(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    except (ValueError, TypeError, OverflowError):
        return None


def display_country(countries: list[str], remote: bool = False) -> str:
    if not countries:
        return "Remoto/Global" if remote else "Não informado"
    if len(countries) <= 3:
        return ", ".join(countries)
    suffix = f"+{len(countries) - 3} país" if len(countries) == 4 else f"+{len(countries) - 3} países"
    return f"{', '.join(countries[:3])} {suffix}"


def normalized_country(value: Any) -> tuple[str, list[str], bool]:
    if isinstance(value, list):
        labels = [str(x.get("name") if isinstance(x, dict) else x).strip() for x in value]
    elif isinstance(value, dict):
        labels = [str(value.get("name") or value.get("label") or "").strip()]
    else:
        labels = re.split(r"[,;|/]", str(value or ""))
    raw_text = clean_text(", ".join(labels), 300)
    remote = bool(re.search(r"\b(remote|worldwide|anywhere|global|distributed|work from anywhere|remoto)\b", raw_text, re.I))
    countries: list[str] = []
    for label in labels:
        cleaned = clean_text(label, 100)
        cleaned = re.sub(r"\b(?:remote|worldwide|anywhere|global|distributed|work from anywhere|remoto)\b", " ", cleaned, flags=re.I)
        key = re.sub(r"\([^)]*\)", " ", cleaned).strip(" ,;|/:.-").casefold()
        canonical = COUNTRY_ALIASES.get(key)
        if canonical == "Remoto/Global":
            remote = True
        elif canonical and canonical not in countries:
            countries.append(canonical)
    return display_country(countries, remote), countries, remote


def make_item(
    source_id: str,
    source_name: str,
    raw_id: Any,
    title: Any,
    url: Any,
    published: Any = None,
    description: Any = "",
    company: Any = "",
    country: Any = "",
    tags: Any = None,
    employment_type: Any = "",
    salary: Any = "",
    remote: bool = False,
    trust_level: str = "source_listing",
    summary_allowed: bool = True,
) -> dict[str, Any] | None:
    link = safe_https_url(url)
    clean_title = clean_text(title, 240)
    if not link or not clean_title:
        return None
    raw_key = str(raw_id or link).strip()
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", raw_key).strip("-.")
    if not slug or len(slug) > 96:
        slug = hashlib.sha256(raw_key.encode("utf-8", "ignore")).hexdigest()[:40]
    tag_values = tags if isinstance(tags, list) else re.split(r"[,|/]", str(tags or ""))
    clean_tags = []
    for tag in tag_values:
        if isinstance(tag, dict):
            tag = tag.get("name") or tag.get("label") or ""
        tag = clean_text(tag, 60)
        if tag and tag.casefold() not in {t.casefold() for t in clean_tags}:
            clean_tags.append(tag)
    location, country_names, location_remote = normalized_country(country)
    remote = bool(remote or location_remote)
    searchable = " ".join([clean_title, clean_text(description, 1500), " ".join(clean_tags), clean_text(employment_type, 80)])
    categories = classify_categories(searchable, source_id, employment_type, remote)
    safe_description = clean_text(description, MAX_DESCRIPTION, preserve_blocks=True) if summary_allowed else ""
    summary = clean_text(safe_description, MAX_SUMMARY)
    clean_salary = clean_text(salary, 100)
    return {
        "id": f"{source_id}:{slug}",
        "title": clean_title,
        "summary": summary,
        "description": safe_description,
        "company": clean_text(company, 120),
        "country": location,
        "countries": country_names,
        "remote": remote,
        "categories": categories,
        "type": normalize_type(source_id, employment_type, searchable),
        "salary": clean_salary,
        "publishedAt": parse_datetime(published),
        "sourceName": source_name,
        "sourceUrl": link,
        "sourceLinks": [{"name": source_name, "url": link}],
        "tags": clean_tags[:12],
        "status": "UNKNOWN",
        "trustLevel": trust_level,
        "language": "unknown",
    }


def classify_categories(text: str, source_id: str, employment_type: Any, remote: bool) -> list[str]:
    value = f" {text.casefold()} "
    categories = [name for name, terms in CATEGORY_RULES if any(term in value for term in terms)]
    if source_id in {"jobicy", "remoteok", "weworkremotely", "agl_angola", "reliefweb", "greenhouse", "usajobs"} and "employment" not in categories:
        categories.append("employment")
    if source_id == "github" and "projects" not in categories:
        categories.append("projects")
    if source_id == "bluesky" and "social" not in categories:
        categories.append("social")
    if any(term in str(employment_type).casefold() for term in ("intern", "trainee")) and "internship" not in categories:
        categories.append("internship")
    if remote and "remote" not in categories:
        categories.append("remote")
    return categories or ["projects"]


def normalize_type(source_id: str, employment_type: Any, text: str) -> str:
    if source_id == "github":
        return "open-source contribution"
    if source_id == "bluesky":
        return "community post · unverified"
    if source_id == "agl_angola":
        return "employment"
    value = f"{employment_type} {text}".casefold()
    if "intern" in value or "estágio" in value or "estagio" in value:
        return "internship"
    if any(x in value for x in ("freelance", "contractor", "contract role", "freelancer")):
        return "freelance/contract"
    if "training" in value or "course" in value or "formation" in value:
        return "training"
    return "employment"


def request_bytes(url: str, headers: dict[str, str] | None = None, timeout: int = 25) -> bytes:
    request_headers = {"User-Agent": USER_AGENT, "Accept": "application/json, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5"}
    request_headers.update(headers or {})
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers=request_headers)
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in (403, 404, 422):
                raise
            if exc.code in (429, 503):
                delay = min(max(int(exc.headers.get("Retry-After", "5")), 2), 45)
                time.sleep(delay)
            elif exc.code >= 500:
                time.sleep(2 ** attempt)
            else:
                raise
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"request failed after retries: {type(last_error).__name__}")


def request_json(url: str, headers: dict[str, str] | None = None) -> Any:
    payload = request_bytes(url, headers)
    return json.loads(payload.decode("utf-8-sig"))


def get_github_token() -> str:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        return token.strip()
    try:
        return subprocess.check_output(["gh", "auth", "token"], text=True, stderr=subprocess.DEVNULL, timeout=5).strip()
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return ""


def fetch_jobicy() -> list[dict[str, Any]]:
    url = "https://jobicy.com/api/v2/remote-jobs?" + urllib.parse.urlencode({"count": 100})
    payload = request_json(url)
    jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
    items = []
    for job in jobs:
        item = make_item(
            "jobicy", "Jobicy", job.get("id"), job.get("jobTitle"), job.get("url"),
            job.get("pubDate"), job.get("jobDescription") or job.get("jobExcerpt"),
            job.get("companyName"), job.get("jobGeo"), job.get("jobIndustry") or job.get("jobType"),
            job.get("jobType"), _jobicy_salary(job), True,
        )
        if item:
            items.append(item)
    return items


def _jobicy_salary(job: dict[str, Any]) -> str:
    minimum = job.get("annualSalaryMin") or job.get("salaryMin")
    maximum = job.get("annualSalaryMax") or job.get("salaryMax")
    currency = clean_text(job.get("salaryCurrency"), 12)
    if minimum and maximum and currency:
        return f"{minimum}–{maximum} {currency}"
    if minimum and currency:
        return f"A partir de {minimum} {currency}"
    if job.get("salary"):
        return clean_text(job.get("salary"), 100)
    return ""


def fetch_remoteok() -> list[dict[str, Any]]:
    payload = request_json("https://remoteok.com/api")
    jobs = payload if isinstance(payload, list) else []
    items = []
    for job in jobs:
        if not isinstance(job, dict) or not job.get("id") or not job.get("position"):
            continue
        salary = ""
        if job.get("salary"):
            salary = clean_text(job.get("salary"), 100)
        item = make_item(
            "remoteok", "Remote OK", job.get("id"), job.get("position"), job.get("url"),
            job.get("date"), job.get("description"), job.get("company"), job.get("location") or "Worldwide",
            job.get("tags") or [], job.get("job_type"), salary, True,
        )
        if item:
            items.append(item)
    return items


def fetch_weworkremotely() -> list[dict[str, Any]]:
    payload = request_bytes("https://weworkremotely.com/remote-jobs.rss")
    root = ET.fromstring(payload)
    items = []
    for entry in root.findall(".//item"):
        title = entry.findtext("title") or ""
        link = entry.findtext("link") or entry.findtext("guid") or ""
        description = entry.findtext("description") or ""
        guid = entry.findtext("guid") or link
        published = entry.findtext("pubDate")
        item = make_item("weworkremotely", "We Work Remotely", guid, title, link, published, description, "", "Remoto/Global", [], "remote", "", True)
        if item:
            items.append(item)
    return items


def fetch_agl_angola() -> list[dict[str, Any]]:
    root = ET.fromstring(request_bytes(AGL_ANGOLA_FEED_URL))
    items = []
    for entry in root.findall(".//item"):
        title = clean_text(entry.findtext("title"), 240)
        title = re.sub(r"^\d{4}-\d+\s*", "", title).lstrip(" -‐‑‒–—−").strip()
        link = entry.findtext("link") or ""
        description = entry.findtext("description") or ""
        item = make_item(
            "agl_angola", "AGL Angola Careers", entry.findtext("guid") or link,
            title, link, entry.findtext("pubDate"), description,
            "AGL (Africa Global Logistics)", "Angola", [], "employment", "", False,
        )
        if item:
            items.append(item)
    return items


def fetch_github_issues() -> list[dict[str, Any]]:
    token = get_github_token()
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    since = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
    queries = ('label:"good first issue"', 'label:"help wanted"', 'label:bounty')
    items: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for label_query in queries:
        params = urllib.parse.urlencode({"q": f"is:issue is:open {label_query} created:>={since}", "sort": "created", "order": "desc", "per_page": 100})
        payload = request_json(f"https://api.github.com/search/issues?{params}", headers)
        for issue in payload.get("items", []):
            if issue.get("pull_request") or str(issue.get("id")) in seen_ids:
                continue
            seen_ids.add(str(issue.get("id")))
            repo_api = str(issue.get("repository_url") or "")
            repo_name = "/".join(repo_api.rstrip("/").split("/")[-2:]) if repo_api else ""
            labels = [label.get("name", "") for label in issue.get("labels", []) if isinstance(label, dict)]
            item = make_item(
                "github", "GitHub Issues", issue.get("id"), issue.get("title"), issue.get("html_url"),
                issue.get("created_at"), issue.get("body"), repo_name, "Não informado", labels,
                "open-source contribution", "", False, "community_project",
            )
            if item:
                item["company"] = ""
                item["project"] = repo_name
                item["salary"] = ""
                item["summary"] = clean_text(issue.get("body"), MAX_SUMMARY)
                item["description"] = clean_text(issue.get("body"), MAX_DESCRIPTION)
                items.append(item)
    return items


def fetch_bluesky() -> list[dict[str, Any]]:
    terms = ("hiring developer", "freelance developer", "programming opportunity")
    items: list[dict[str, Any]] = []
    seen_uris: set[str] = set()
    errors = 0
    for term in terms:
        params = urllib.parse.urlencode({"q": term, "limit": 50, "sort": "latest"})
        payload = request_json(f"https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?{params}", {"Accept": "application/json"})
        for post_view in payload.get("posts", []):
            post = post_view.get("post") or post_view
            record = post.get("record") or {}
            uri = post.get("uri") or ""
            if not uri or uri in seen_uris:
                continue
            seen_uris.add(uri)
            author = post.get("author") or {}
            handle = author.get("handle")
            rkey = uri.rsplit("/", 1)[-1]
            did = author.get("did") or ""
            profile = handle or did
            link = f"https://bsky.app/profile/{urllib.parse.quote(str(profile), safe=':')}/post/{urllib.parse.quote(rkey, safe='')}" if profile and rkey else ""
            text = record.get("text") or ""
            if not _looks_like_opportunity(text):
                continue
            country = _country_from_text(text)
            item = make_item(
                "bluesky", "Bluesky", f"{did}-{rkey}", text[:180], link,
                record.get("createdAt") or post.get("indexedAt"), text, "", country,
                [], "community post", "", _mentions_remote(text), "social_unverified",
            )
            if item:
                item["title"] = _social_title(text)
                item["summary"] = clean_text(text, MAX_SUMMARY)
                item["description"] = clean_text(text, 1200)
                item["company"] = ""
                items.append(item)
    return items


def _looks_like_opportunity(text: str) -> bool:
    value = f" {clean_text(text, 2000).casefold()} "
    keywords = (" hiring ", " hire ", " job ", " jobs ", " vacancy ", " vacancies ", " freelance ", " freelancer ", " contract ", " internship ", " intern ", " opportunity ", " opportunities ", " looking for a developer ", " procura-se ", " vaga ", " vagas ", " emprego ", " estágio ", " estagio ", " projeto pago ", " paid project ", " teacher ", " tutor ")
    return any(term in value for term in keywords)


def _mentions_remote(text: str) -> bool:
    return bool(re.search(r"\b(remote|remoto|worldwide|anywhere|global|online|virtual)\b", text, re.I))


def _country_from_text(text: str) -> str:
    value = text.casefold()
    for needle, country in sorted(COUNTRY_ALIASES.items(), key=lambda entry: len(entry[0]), reverse=True):
        if re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", value):
            return country
    return "Não informado"


def _social_title(text: str) -> str:
    clean = clean_text(text, 200)
    first = re.split(r"[\n.!?]", clean, maxsplit=1)[0].strip()
    return first if len(first) >= 12 else clean[:160]


def fetch_reliefweb(appname: str) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode({"appname": appname, "limit": 100, "sort[]": "date.created:desc"})
    payload = request_json(f"https://api.reliefweb.int/v2/jobs?{params}")
    items = []
    for entry in payload.get("data", []):
        fields = entry.get("fields") or {}
        source = fields.get("source") or []
        source_name = "ReliefWeb"
        if source and isinstance(source, list) and isinstance(source[0], dict):
            source_name = clean_text(source[0].get("name") or "ReliefWeb", 100)
        country_values = fields.get("country") or []
        country = country_values[0].get("name") if country_values and isinstance(country_values[0], dict) else ""
        organization = fields.get("organization") or []
        company = organization[0].get("name") if organization and isinstance(organization[0], dict) else ""
        item = make_item(
            "reliefweb", "ReliefWeb", entry.get("id"), fields.get("title"), fields.get("url"),
            (fields.get("date") or {}).get("created"), "", company, country,
            fields.get("career_category") or fields.get("theme") or [], "employment", "", False,
            "source_listing", summary_allowed=False,
        )
        if item:
            item["sourcePublisher"] = source_name
            items.append(item)
    return items


def fetch_greenhouse() -> list[dict[str, Any]]:
    raw = os.environ.get("GREENHOUSE_BOARDS", "").strip()
    if not raw:
        return []
    items = []
    for board_spec in raw.split(",")[:30]:
        token, _, company = board_spec.strip().partition(":")
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", token):
            continue
        payload = request_json(f"https://boards-api.greenhouse.io/v1/boards/{urllib.parse.quote(token, safe='')}/jobs?content=true")
        for job in payload.get("jobs", []):
            content = job.get("content") or ""
            location = (job.get("location") or {}).get("name", "")
            item = make_item("greenhouse", "Greenhouse", job.get("id"), job.get("title"), job.get("absolute_url"), job.get("updated_at"), content, company, location, job.get("departments") or [], "employment", "")
            if item:
                items.append(item)
    return items


def _identity(item: dict[str, Any]) -> tuple[str, str]:
    url = safe_https_url(item.get("sourceUrl"))
    parsed = urllib.parse.urlsplit(url)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    query = [(k, v) for k, v in query if not k.casefold().startswith("utm_") and k.casefold() not in {"ref", "source", "fbclid", "gclid"}]
    normalized_url = urllib.parse.urlunsplit((parsed.scheme, (parsed.netloc or "").casefold(), parsed.path.rstrip("/"), urllib.parse.urlencode(query), ""))
    title = re.sub(r"[^a-z0-9]+", " ", clean_text(item.get("title"), 240).casefold()).strip()
    company = re.sub(r"[^a-z0-9]+", " ", clean_text(item.get("company") or item.get("project"), 120).casefold()).strip()
    country = clean_text(item.get("country"), 120).casefold()
    fingerprint = "|".join((title, company, country)) if title else ""
    return normalized_url, fingerprint


def merge_records(previous: list[dict[str, Any]], fresh: list[dict[str, Any]], now: datetime) -> list[dict[str, Any]]:
    cutoff = now - timedelta(days=45)
    merged: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    by_identity: dict[str, dict[str, Any]] = {}
    for candidate in previous + fresh:
        if not isinstance(candidate, dict):
            continue
        item = dict(candidate)
        published = parse_datetime(item.get("publishedAt"))
        if published:
            item["publishedAt"] = published
            if datetime.fromisoformat(published.replace("Z", "+00:00")) < cutoff:
                continue
        link = safe_https_url(item.get("sourceUrl"))
        if not link or not clean_text(item.get("title"), 240):
            continue
        item["sourceUrl"] = link
        if "sourceLinks" not in item:
            item["sourceLinks"] = [{"name": item.get("sourceName", "Fonte"), "url": link}]
        url_key, fingerprint = _identity(item)
        existing = by_id.get(str(item.get("id"))) or by_identity.get(url_key) or (by_identity.get(fingerprint) if fingerprint else None)
        if existing is None:
            if not isinstance(item.get("countries"), list):
                normalized, country_names, location_remote = normalized_country(item.get("country"))
                item["country"] = normalized
                item["countries"] = country_names
                item["remote"] = bool(item.get("remote") or location_remote)
            item.setdefault("summary", "")
            item.setdefault("description", "")
            item.setdefault("company", "")
            item.setdefault("country", "Não informado")
            item.setdefault("remote", False)
            item.setdefault("categories", ["projects"])
            item.setdefault("type", "employment")
            item.setdefault("salary", "")
            item.setdefault("status", "UNKNOWN")
            item.setdefault("trustLevel", "source_listing")
            item.setdefault("tags", [])
            item.setdefault("language", "unknown")
            item["sourceLinks"] = _unique_sources(item.get("sourceLinks", []))
            merged.append(item)
            by_id[str(item.get("id"))] = item
            if url_key:
                by_identity[url_key] = item
            if fingerprint:
                by_identity[fingerprint] = item
            continue
        for source in item.get("sourceLinks", []):
            existing["sourceLinks"] = _unique_sources(existing.get("sourceLinks", []) + [source])
        country_union = list(dict.fromkeys((existing.get("countries") if isinstance(existing.get("countries"), list) else []) + (item.get("countries") if isinstance(item.get("countries"), list) else [])))
        existing["countries"] = country_union
        existing["remote"] = bool(existing.get("remote") or item.get("remote"))
        if country_union:
            existing["country"] = display_country(country_union, existing["remote"])
        elif existing["remote"]:
            existing["country"] = "Remoto/Global"
        if len(clean_text(item.get("summary"), MAX_SUMMARY)) > len(clean_text(existing.get("summary"), MAX_SUMMARY)):
            existing["summary"] = clean_text(item.get("summary"), MAX_SUMMARY)
            existing["description"] = clean_text(item.get("description"), MAX_DESCRIPTION, preserve_blocks=True)
        if not existing.get("salary") and item.get("salary"):
            existing["salary"] = item["salary"]
        if not existing.get("company") and item.get("company"):
            existing["company"] = item["company"]
        dates = [parse_datetime(existing.get("publishedAt")), parse_datetime(item.get("publishedAt"))]
        dates = [d for d in dates if d]
        if dates:
            existing["publishedAt"] = max(dates)
        if item.get("trustLevel") == "social_unverified":
            existing["trustLevel"] = "social_unverified"
    merged.sort(key=lambda x: (parse_datetime(x.get("publishedAt")) is not None, parse_datetime(x.get("publishedAt")) or ""), reverse=True)
    return merged


def split_feed_items(items: list[dict[str, Any]], fallback_descriptions: dict[str, str] | None = None) -> tuple[list[dict[str, Any]], dict[str, str]]:
    fallback_descriptions = fallback_descriptions or {}
    lightweight: list[dict[str, Any]] = []
    descriptions: dict[str, str] = {}
    for source in items:
        item = dict(source)
        item_id = str(item.get("id") or "")
        raw_description = item.pop("description", "") or fallback_descriptions.get(item_id, "")
        description = clean_text(raw_description, 900, preserve_blocks=True)
        summary = clean_text(item.get("summary"), MAX_SUMMARY)
        item["summary"] = summary
        has_details = bool(description and len(description) > len(summary) + 40 and description.casefold() != summary.casefold())
        item["hasDetails"] = has_details
        if has_details:
            descriptions[item_id] = description
        lightweight.append(item)
    return lightweight, descriptions


def _unique_sources(values: list[Any]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    seen = set()
    for value in values:
        if not isinstance(value, dict):
            continue
        url = safe_https_url(value.get("url"))
        name = clean_text(value.get("name"), 100)
        key = (name.casefold(), url)
        if name and url and key not in seen:
            result.append({"name": name, "url": url})
            seen.add(key)
    return result


def static_source_status(source: OpportunitySource, status: str, note: str | None = None) -> dict[str, Any]:
    return {
        "id": source.id,
        "name": source.name,
        "type": source.kind,
        "countries": list(source.countries),
        "categories": list(source.categories),
        "method": source.method,
        "frequencyMinutes": source.frequency_minutes,
        "limit": source.limit,
        "status": status,
        "lastSyncAt": None,
        "itemsFound": 0,
        "note": note or source.note,
    }


def run_collection(output_path: Path, dry_run: bool = False, details_path: Path | None = None) -> tuple[dict[str, Any], int]:
    details_path = details_path or output_path.with_name("radar-details.generated.json")
    now = datetime.now(timezone.utc).replace(microsecond=0)
    now_text = now.isoformat().replace("+00:00", "Z")
    definitions = {s.id: s for s in SOURCE_REGISTRY}
    statuses: dict[str, dict[str, Any]] = {}
    fresh: list[dict[str, Any]] = []
    successes = 0

    fetchers: list[tuple[str, Callable[[], list[dict[str, Any]]]]] = [
        ("jobicy", fetch_jobicy),
        ("remoteok", fetch_remoteok),
        ("weworkremotely", fetch_weworkremotely),
        ("agl_angola", fetch_agl_angola),
        ("github", fetch_github_issues),
        ("bluesky", fetch_bluesky),
    ]
    for source_id, fetcher in fetchers:
        source = definitions[source_id]
        try:
            records = fetcher()
            fresh.extend(records)
            successes += 1
            statuses[source_id] = static_source_status(source, "ok")
            statuses[source_id]["lastSyncAt"] = now_text
            statuses[source_id]["itemsFound"] = len(records)
            print(f"{source.name}: {len(records)} records")
        except Exception as exc:
            statuses[source_id] = static_source_status(source, "unavailable", "Fonte temporariamente indisponível; outros feeds continuam ativos.")
            print(f"{source.name}: unavailable ({type(exc).__name__})", file=sys.stderr)

    reliefweb_appname = os.environ.get("RELIEFWEB_APPNAME", "").strip()
    if reliefweb_appname:
        source = definitions["reliefweb"]
        try:
            records = fetch_reliefweb(reliefweb_appname)
            fresh.extend(records)
            successes += 1
            statuses["reliefweb"] = static_source_status(source, "ok")
            statuses["reliefweb"]["lastSyncAt"] = now_text
            statuses["reliefweb"]["itemsFound"] = len(records)
        except Exception as exc:
            statuses["reliefweb"] = static_source_status(source, "unavailable", "ReliefWeb não respondeu; o restante do Radar continua ativo.")
            print(f"ReliefWeb: unavailable ({type(exc).__name__})", file=sys.stderr)
    else:
        statuses["reliefweb"] = static_source_status(definitions["reliefweb"], "approval_required", "Aguardar appname pré-aprovado pelo ReliefWeb; fonte não consultada.")

    greenhouse_configured = bool(os.environ.get("GREENHOUSE_BOARDS", "").strip())
    if greenhouse_configured:
        source = definitions["greenhouse"]
        try:
            records = fetch_greenhouse()
            fresh.extend(records)
            successes += 1
            statuses["greenhouse"] = static_source_status(source, "ok")
            statuses["greenhouse"]["lastSyncAt"] = now_text
            statuses["greenhouse"]["itemsFound"] = len(records)
        except Exception as exc:
            statuses["greenhouse"] = static_source_status(source, "unavailable", "Um board Greenhouse configurado não respondeu; outros boards continuam ativos.")
            print(f"Greenhouse: unavailable ({type(exc).__name__})", file=sys.stderr)
    else:
        statuses["greenhouse"] = static_source_status(definitions["greenhouse"], "not_configured", "Sem boards de carreiras oficiais configurados.")

    if os.environ.get("USAJOBS_API_KEY") and os.environ.get("USAJOBS_USER_AGENT"):
        statuses["usajobs"] = static_source_status(definitions["usajobs"], "adapter_pending", "Credenciais detetadas, mas o adaptador aguarda validação do endpoint e contrato oficial atual.")
    else:
        statuses["usajobs"] = static_source_status(definitions["usajobs"], "credentials_required", "Configurar USAJOBS_API_KEY e USAJOBS_USER_AGENT como secrets; a fonte não é consultada sem ambos.")

    statuses["arbeitnow"] = static_source_status(definitions["arbeitnow"], "terms_pending", "A API não foi ativada porque os termos de republicação ainda não estão claros.")

    if successes == 0:
        raise RuntimeError("Todas as fontes consultáveis falharam; o dataset anterior foi preservado.")

    previous: list[dict[str, Any]] = []
    previous_descriptions: dict[str, str] = {}
    if output_path.exists():
        try:
            old = json.loads(output_path.read_text(encoding="utf-8"))
            previous = old.get("items", []) if isinstance(old, dict) else []
            for old_item in previous:
                if isinstance(old_item, dict) and old_item.get("id") and old_item.get("description"):
                    previous_descriptions[str(old_item["id"])] = str(old_item["description"])
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Dataset Radar anterior inválido: {exc}") from exc
    if details_path.exists():
        try:
            old_details = json.loads(details_path.read_text(encoding="utf-8"))
            saved_descriptions = old_details.get("descriptions", {}) if isinstance(old_details, dict) else {}
            if isinstance(saved_descriptions, dict):
                previous_descriptions.update({str(key): str(value) for key, value in saved_descriptions.items() if isinstance(value, str)})
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Dataset de detalhes Radar anterior inválido: {exc}") from exc
    items = merge_records(previous, fresh, now)
    lightweight_items, descriptions = split_feed_items(items, previous_descriptions)
    document = {
        "schemaVersion": 1,
        "generatedAt": now_text,
        "refreshIntervalMinutes": 60,
        "items": lightweight_items,
        "sources": [statuses[s.id] for s in SOURCE_REGISTRY],
        "coverageNotes": [
            "O Radar agrega e encaminha; não verifica cada anúncio nem processa candidaturas.",
            "AGL Angola Careers usa a feed RSS oficial filtrada para Angola; os anúncios mantêm um excerto e o link para a publicação original.",
            "Publicações Bluesky são pistas comunitárias não verificadas. Se a API estiver indisponível, nenhuma publicação é inventada.",
            "Reddit, Mastodon, LinkedIn, X, Instagram e Facebook não estão ativos: dependem de APIs oficiais, credenciais e permissões específicas; o site não faz scraping.",
            "Freelance remunerado, salário, localização e contactos só aparecem se a fonte os fornecer explicitamente.",
        ],
    }
    details_document = {"schemaVersion": 1, "generatedAt": now_text, "descriptions": descriptions}
    if not dry_run:
        output_path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        details_path.write_text(json.dumps(details_document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return document, successes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Ficheiro JSON gerado")
    parser.add_argument("--details-output", type=Path, default=DEFAULT_DETAILS_OUTPUT, help="Ficheiro opcional de descrições longas, carregado sob demanda")
    parser.add_argument("--dry-run", action="store_true", help="Consultar fontes e validar dados sem escrever no disco")
    args = parser.parse_args()
    try:
        document, successes = run_collection(args.output, args.dry_run, args.details_output)
        print(f"Radar: {len(document['items'])} oportunidades após deduplicação; {successes} fontes consultadas com sucesso.")
        print(f"Última verificação: {document['generatedAt']}; ficheiro: {'não escrito (--dry-run)' if args.dry_run else args.output}")
        return 0
    except Exception as exc:
        print(f"Radar update failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
