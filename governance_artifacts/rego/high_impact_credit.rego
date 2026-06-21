package gsifi.ai.credit

default allow = false

# Rule for high-impact credit underwriting decisions
# Integrates MAS FEAT and HKMA Ethics requirements
allow if {
  input.model.use_case == "credit_underwriting"
  input.risk_tier == "high"
  input.human_review.completed

  # HKMA Ethics: Ensure interpretability via CAE
  input.explainability.cae_verified == true
  input.explainability.reason_codes_count >= 3

  # MAS FEAT: Ensure demographic parity via ZK proofs
  input.fairness.zk_dp_proof_verified == true
  input.fairness.demographic_parity_delta <= 0.05

  input.data.lineage.verified
  not input.incident_flags.active
}

deny[msg] if {
  input.model.use_case == "credit_underwriting"
  not input.human_review.completed
  msg := "Human review required for high-impact credit decisions"
}

deny[msg] if {
  input.model.use_case == "credit_underwriting"
  input.risk_tier == "high"
  not input.explainability.cae_verified
  msg := "HKMA Ethics Compliance: Missing CAE interpretability verification"
}

deny[msg] if {
  input.model.use_case == "credit_underwriting"
  input.risk_tier == "high"
  not input.fairness.zk_dp_proof_verified
  msg := "MAS FEAT Compliance: Missing ZK Demographic Parity proof verification"
}
