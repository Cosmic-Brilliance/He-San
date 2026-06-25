import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOVERNANCE_ROOT = ROOT / "governance_artifacts"


def generate_zk_proof():
    """Generates a mock ZK-Fairness proof for Demographic Parity."""
    proof_path = GOVERNANCE_ROOT / "zk" / "demographic_parity_proof.json"
    proof_data = {
        "proof_id": f"zk-dp-{int(time.time())}",
        "statement": "Demographic Parity proof for retail credit expert node",
        "proving_system": "groth16",
        "public_inputs": ["threshold:0.05", f"actual_delta:{round(0.02 + (time.time() % 0.02), 4)}"],
        "verification": {
            "gc_ir_verifier": "https://sentinel.internal/verifiers/zk-dp-v1.json",
            "key_fingerprint": "SHA256:7f8e9d0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c",
        },
    }

    proof_path.write_text(json.dumps(proof_data, indent=2))
    print(f"Generated ZK proof: {proof_path}")


def generate_cae_envelope():
    """Generates a mock Contextual Attribution Envelope for interpretability."""
    envelope_path = GOVERNANCE_ROOT / "interpretability" / "cae_envelope.json"

    # Simulate ethical context hash
    ethical_context = "Human-centric AI deployment for credit underwriting"
    ethical_hash = hashlib.sha256(ethical_context.encode()).hexdigest()

    envelope_data = {
        "attribution_source": "MoE_Credit_Expert_Alpha",
        "context_window": 2048,
        "ethical_hash": f"sha256:{ethical_hash}",
        "attribution_score": 0.985,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    envelope_path.write_text(json.dumps(envelope_data, indent=2))
    print(f"Generated CAE envelope: {envelope_path}")


if __name__ == "__main__":
    GOVERNANCE_ROOT.mkdir(parents=True, exist_ok=True)
    (GOVERNANCE_ROOT / "zk").mkdir(exist_ok=True)
    (GOVERNANCE_ROOT / "interpretability").mkdir(exist_ok=True)

    generate_zk_proof()
    generate_cae_envelope()
