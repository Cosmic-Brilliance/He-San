import unittest

from omni_sentinel_cli import (
    AuditLogEntry,
    OmniSentinel,
    PhaseState,
    TelemetrySnapshot,
)


class TestOmniSentinel(unittest.TestCase):
    def setUp(self):
        self.sentinel = OmniSentinel(sample_interval_ms=10)

    def test_initial_phase(self):
        self.assertEqual(self.sentinel.phase, PhaseState.INIT)

    def test_rule_registration(self):
        self.assertEqual(len(self.sentinel.engine.rules), 4)

    def test_telemetry_sampling(self):
        snapshot = self.sentinel.monitor.sample(self.sentinel.phase)
        self.assertIsInstance(snapshot, TelemetrySnapshot)
        self.assertGreater(snapshot.throughput, 0)

    def test_pii_redaction(self):
        data = {"msg": "My SSN is 123-45-6789", "api_key": "secret"}
        sanitized = AuditLogEntry._sanitize_pii(data)
        self.assertEqual(sanitized["msg"], "My SSN is <REDACTED_SSN>")
        self.assertEqual(sanitized["api_key"], "<REDACTED_PII>")


if __name__ == "__main__":
    unittest.main()
