"use client";

export interface GovernanceMeta {
  use_case: string;
  risk_tier: string;
  zk_dp_proof_verified: boolean;
  cae_verified: boolean;
  compliance_regimes: string[];
}

export function ProvenanceBadge({ meta }: { meta: { name?: string; model?: string; version?: string; layer?: string; latencyMs?: number, governance?: GovernanceMeta | null } }) {
  const label = `${meta.layer ?? 'surface'} • ${meta.name ?? meta.model ?? 'model'} ${meta.version ?? ''}`;
  const color = (meta.layer ?? 'surface') === 'surface' ? '#38A169' : '#1A237E';

  const gov = meta.governance;

  return (
    <div className="flex flex-col gap-1">
      <span role="status" aria-label={`Model ${label}`} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs text-slate-700">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
        {meta.latencyMs != null && <span className="text-slate-500">• {meta.latencyMs}ms</span>}
      </span>
      {gov && (
        <div className="flex flex-wrap gap-1">
          {gov.zk_dp_proof_verified && (
            <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              MAS FEAT: ZK-PASS
            </span>
          )}
          {gov.cae_verified && (
            <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              HKMA Ethics: CAE-PASS
            </span>
          )}
          {gov.risk_tier === 'high' && (
            <span className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-700/10">
              HIGH RISK
            </span>
          )}
        </div>
      )}
    </div>
  );
}
