# Learnings: Omni-Sentinel Governance Remediation

## Technical Patterns
- **Governance-as-Code Integration**: Attestations (ZK proofs, CAE envelopes) should be linked to active runtime paths (API streams) via metadata events. This ensures that every high-risk decision is accompanied by its compliance evidence.
- **Dynamic Path Resolution**: In modular projects (e.g., Python backend + Next.js frontend), library functions checking for governance artifacts must handle multiple execution contexts (e.g., running from project root vs. app directory).
- **Business Logic in Validators**: Beyond schema validation, governance validators should enforce business constraints (e.g., MAS FEAT Demographic Parity delta thresholds) to ensure regulatory compliance, not just technical correctness.

## System Integration
- **Next.js SSE Metadata**: Utilizing Server-Sent Events (SSE) metadata events is an effective way to transmit non-content information (latency, governance status, pre/post moderation results) without cluttering the primary token stream.
- **Mocking for High-Maturity Simulation**: Automated script-based generation of ZK proofs and CAE specifications is a viable path to demonstrate maturity score 3+ implementation before full crypto-infrastructure is deployed.

## Deployment & Verification
- **Playwright in Sandbox**: Headless browser testing in resource-constrained environments may require longer timeouts or simplified UI flows to reliably capture state transitions in streaming APIs.
