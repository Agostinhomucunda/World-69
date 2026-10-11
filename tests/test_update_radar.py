from __future__ import annotations

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import update_radar as radar  # noqa: E402


class RadarPipelineTests(unittest.TestCase):
    def test_plain_text_removes_markup_contacts_and_urls(self) -> None:
        value = "<p>Python developer role</p><script>alert('x')</script> Apply: jane@example.org +244 923 456 789 https://example.org/apply"
        cleaned = radar.clean_text(value)
        self.assertIn("Python developer role", cleaned)
        self.assertNotIn("alert", cleaned)
        self.assertNotIn("jane@example.org", cleaned)
        self.assertNotIn("923 456 789", cleaned)
        self.assertNotIn("https://", cleaned)

    def test_email_like_address_with_alphanumeric_suffix_is_redacted(self) -> None:
        cleaned = radar.clean_text("dev@example.co1 and dev@example.c")
        self.assertNotIn("@", cleaned)

    def test_long_description_preserves_source_sections_for_expanded_view(self) -> None:
        source = "<h3>Mission</h3><p>Manage the workshop.</p><ul><li>Maintain equipment.</li><li>Lead technicians.</li></ul>"
        expanded = radar.clean_text(source, preserve_blocks=True)
        summary = radar.clean_text(source)
        inline = radar.clean_text("<b>Hello</b>world")
        self.assertIn("Mission\n", expanded)
        self.assertIn("Maintain equipment.\nLead technicians.", expanded)
        self.assertNotIn("\n", summary)
        self.assertEqual(inline, "Hello world")

    def test_split_feed_writes_sanitized_legacy_summary(self) -> None:
        items, descriptions = radar.split_feed_items([{"id": "legacy:1", "summary": "dev@example.c"}])
        self.assertNotIn("@", items[0]["summary"])
        self.assertEqual(descriptions, {})

    def test_external_urls_require_https(self) -> None:
        self.assertEqual(radar.safe_https_url("javascript:alert(1)"), "")
        self.assertEqual(radar.safe_https_url("http://example.org/job"), "")
        self.assertEqual(radar.safe_https_url("https://example.org/job#apply"), "https://example.org/job")

    def test_classification_is_deterministic_and_not_paid_by_default(self) -> None:
        item = radar.make_item(
            "github", "GitHub Issues", "123", "Build a Python website", "https://github.com/example/project/issues/123",
            "2026-10-01T10:00:00Z", "Help wanted for an open source project", "", "Não informado", ["good first issue"],
        )
        self.assertIsNotNone(item)
        self.assertIn("programming", item["categories"])
        self.assertIn("websites", item["categories"])
        self.assertIn("projects", item["categories"])
        self.assertEqual(item["salary"], "")
        self.assertEqual(item["type"], "open-source contribution")

    def test_country_normalization_keeps_known_countries_and_drops_regions_and_cities(self) -> None:
        item = radar.make_item("remoteok", "Remote OK", "multi-country", "Python role", "https://example.org/jobs/geo", country="Argentina, Brazil, Mexico")
        city = radar.make_item("remoteok", "Remote OK", "city", "Design role", "https://example.org/jobs/city", country="Black Bess, Boston")
        self.assertEqual(item["countries"], ["Argentina", "Brasil", "México"])
        self.assertEqual(item["country"], "Argentina, Brasil, México")
        self.assertEqual(city["countries"], [])
        self.assertEqual(city["country"], "Não informado")
        self.assertEqual(radar._country_from_text("We are looking for a business developer"), "Não informado")

    def test_duplicate_canonical_url_merges_source_attribution(self) -> None:
        now = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
        one = radar.make_item("jobicy", "Jobicy", "1", "Python Developer", "https://company.example/jobs/1?utm_source=jobicy", "2026-10-01T10:00:00Z", "Build APIs", "Acme", "Remote")
        two = radar.make_item("remoteok", "Remote OK", "2", "Python Developer", "https://company.example/jobs/1", "2026-10-01T11:00:00Z", "Build APIs and services", "Acme", "Worldwide")
        merged = radar.merge_records([], [one, two], now)
        self.assertEqual(len(merged), 1)
        self.assertEqual({x["name"] for x in merged[0]["sourceLinks"]}, {"Jobicy", "Remote OK"})
        self.assertEqual(merged[0]["publishedAt"], "2026-10-01T11:00:00Z")

    def test_long_descriptions_are_separated_from_the_initial_feed(self) -> None:
        description = "A detailed opportunity description with useful requirements. " * 35
        item = radar.make_item("jobicy", "Jobicy", "detail-test", "Python Developer", "https://example.org/jobs/detail-test", "2026-10-01T10:00:00Z", description, "Acme", "Remote")
        lightweight, descriptions = radar.split_feed_items([item])
        self.assertNotIn("description", lightweight[0])
        self.assertTrue(lightweight[0]["hasDetails"])
        self.assertEqual(len(descriptions), 1)
        self.assertLessEqual(len(descriptions[item["id"]]), 900)

    def test_old_records_are_not_republished_as_recent(self) -> None:
        now = datetime(2026, 10, 1, tzinfo=timezone.utc)
        old = radar.make_item("jobicy", "Jobicy", "old", "Old role", "https://example.org/jobs/old", "2026-07-01T10:00:00Z")
        self.assertEqual(radar.merge_records([old], [], now), [])

    def test_bluesky_filter_only_accepts_opportunity_language(self) -> None:
        self.assertTrue(radar._looks_like_opportunity("We are hiring a Python developer remotely"))
        self.assertFalse(radar._looks_like_opportunity("A nice sunset over Luanda"))

    def test_youtube_help_filter_prioritizes_account_incidents(self) -> None:
        self.assertTrue(radar._looks_like_immediate_help("Perdi acesso à minha conta e fui burlado, alguém pode ajudar?"))
        self.assertTrue(radar._looks_like_immediate_help("My account was hacked and I cannot login"))
        self.assertFalse(radar._looks_like_immediate_help("Gostei muito deste vídeo, obrigado pela explicação."))

    def test_youtube_fetch_links_the_matching_comment(self) -> None:
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        payloads = [
            {"items": [{"id": {"videoId": "video123"}, "snippet": {"title": "Como proteger a conta", "channelTitle": "Canal de ajuda"}}]},
            {"items": [{"id": "comment123", "snippet": {"topLevelComment": {"id": "comment123", "snippet": {"textOriginal": "Perdi acesso à minha conta, preciso de ajuda", "publishedAt": now}}}}]},
        ]
        with patch.dict(radar.os.environ, {"YOUTUBE_API_KEY": "test-key", "YOUTUBE_SEARCH_QUERIES": "test"}, clear=False), patch.object(radar, "request_json", side_effect=payloads):
            items = radar.fetch_youtube()
        self.assertEqual(len(items), 1)
        self.assertIn("lc=comment123", items[0]["sourceUrl"])
        self.assertIn("https://www.youtube.com/watch?v=video123", items[0]["sourceLinks"][1]["url"])
        self.assertIn("needs", items[0]["categories"])
        self.assertEqual(items[0]["language"], "pt")
        self.assertEqual(items[0]["priorityLabel"], "Urgente")

    def test_youtube_service_keywords_are_detected_without_promoting_abuse(self) -> None:
        self.assertTrue(radar._looks_like_immediate_help("Preciso criar o meu site, alguém conhece um programador?"))
        self.assertTrue(radar._looks_like_immediate_help("Preciso de um hacker urgente para entrar numa conta"))
        self.assertGreaterEqual(radar._help_priority("fui burlado e perdi acesso à conta", "pt"), 95)


    def test_stackexchange_questions_are_marked_as_immediate_help(self) -> None:
        payload = {"items": [{
            "question_id": 123, "title": "How do I recover a broken Python login flow?",
            "link": "https://stackoverflow.com/questions/123/example",
            "last_activity_date": 1791580000, "tags": ["python", "authentication"],
            "body_markdown": "I need help understanding this error."
        }]}
        with patch.object(radar, "request_json", return_value=payload):
            items = radar.fetch_stackexchange()
        self.assertEqual(len(items), len(radar.STACKEXCHANGE_SITES))
        first = items[0]
        self.assertIn("needs", first["categories"])
        self.assertIn("programming", first["categories"])
        self.assertEqual(first["type"], "community post · unverified")
        self.assertEqual(first["salary"], "")
        self.assertFalse(first["remote"])
        self.assertEqual(first["country"], "Não informado")
        self.assertIn("stackoverflow.com/questions/123", first["sourceUrl"])

    def test_agl_angola_rss_creates_a_linked_angola_employment_item(self) -> None:
        feed = b'''<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><item>
          <title>2026-10288 - LOGISTICS OPERATIONS TECHNICAL DIRECTOR H/F</title>
          <link>https://acareerbyagl.talent-soft.com/Pages/Offre/detailoffre.aspx?idOffre=10288</link>
          <guid>https://acareerbyagl.talent-soft.com/Pages/Offre/detailoffre.aspx?idOffre=10288</guid>
          <pubDate>Mon, 24 Aug 2026 15:31:58 Z</pubDate>
          <description><![CDATA[<div>Function: Industrial Operations</div><h3>Mission Description</h3>
            <ul><li>Maintain AGL Angola equipment.</li><li>Lead the workshop team.</li></ul>]]></description>
        </item></channel></rss>'''
        with patch.object(radar, "request_bytes", return_value=feed):
            items = radar.fetch_agl_angola()
        self.assertEqual(len(items), 1)
        item = items[0]
        self.assertEqual(item["title"], "LOGISTICS OPERATIONS TECHNICAL DIRECTOR H/F")
        self.assertEqual(item["country"], "Angola")
        self.assertEqual(item["countries"], ["Angola"])
        self.assertIn("employment", item["categories"])
        self.assertEqual(item["type"], "employment")
        self.assertIn("Maintain AGL Angola equipment.\nLead the workshop team.", item["description"])
        self.assertIn("idOffre=10288", item["sourceUrl"])


if __name__ == "__main__":
    unittest.main()
