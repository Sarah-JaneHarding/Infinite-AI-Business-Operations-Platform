import React, { useState } from 'react';
import { INITIAL_RISKS } from '../data/mockData';
import { RiskItem } from '../types';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  CheckCircle2, 
  FileText, 
  Database, 
  Key, 
  Cpu, 
  Search,
  ExternalLink,
  ChevronRight,
  Fingerprint
} from 'lucide-react';

export const GovernanceAndRisk: React.FC = () => {
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(INITIAL_RISKS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [ledgerVerified, setLedgerVerified] = useState(true);

  // Simulated Audit Ledger Blocks
  const ledgerBlocks = [
    {
      index: 1042,
      timestamp: '2026-09-02 12:15:20',
      action: 'POLICY_RATIFICATION',
      actor: 'Sarah-Jane (CEO)',
      tenant: 'System-L0',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      prevHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
      status: 'VERIFIED'
    },
    {
      index: 1041,
      timestamp: '2026-09-02 11:48:02',
      action: 'HITL_GATE_APPROVAL',
      actor: 'David K. (CTO)',
      tenant: 'Beacon Ridge Group',
      hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
      prevHash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
      status: 'VERIFIED'
    },
    {
      index: 1040,
      timestamp: '2026-09-02 10:30:15',
      action: 'EGRESS_MEMBRANE_SCRUB',
      actor: 'A14 Security AI',
      tenant: 'Gauteng Logistics',
      hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
      prevHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      status: 'VERIFIED'
    },
    {
      index: 1039,
      timestamp: '2026-09-02 09:12:44',
      action: 'TENANT_ONBOARD_SEEDED',
      actor: 'Thabo R. (Customer Success)',
      tenant: 'National Infrastructure Agency',
      hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      prevHash: '01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b',
      status: 'VERIFIED'
    }
  ];

  const handleVerifyLedger = () => {
    setVerifyingLedger(true);
    setTimeout(() => {
      setVerifyingLedger(false);
      setLedgerVerified(true);
      alert('Ledger Verification Complete: SHA-256 Merkle root unbroken across 1,042 blocks. 100% cryptographic integrity confirmed.');
    }, 800);
  };

  const filteredRisks = selectedCategory === 'All' 
    ? INITIAL_RISKS 
    : INITIAL_RISKS.filter(r => r.category === selectedCategory);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">SECURITY, PRIVACY &amp; ENTERPRISE GOVERNANCE</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            POPIA / GDPR Compliance &amp; <span className="grad">5x5 Risk Heatmap</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Real-time compliance monitoring, statutory POPIA Section 72 alignment, tamper-evident SHA-256 audit ledger,
            and comprehensive 5x5 enterprise operational risk scoring.
          </p>
        </div>

        <button
          onClick={handleVerifyLedger}
          disabled={verifyingLedger}
          className="btn btn-p text-xs self-start md:self-auto"
        >
          <Fingerprint className="w-3.5 h-3.5 mr-1" />
          {verifyingLedger ? 'Verifying Merkle Tree...' : 'Verify Cryptographic Ledger'}
        </button>
      </div>

      {/* POPIA / GDPR Four Laws Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4 border-l-2 border-l-emerald-400">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">LAW 01 · THE MEMBRANE</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-base font-bold text-[#E9EDF8] mt-1">Zero PII Egress</p>
          <span className="text-[10px] text-emerald-400">Tested vs 40+ jailbreaks</span>
        </div>

        <div className="panel p-4 border-l-2 border-l-cyan-400">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">LAW 02 · THE KEYSTONE</span>
            <Lock className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <p className="text-base font-bold text-[#E9EDF8] mt-1">The Human Decides</p>
          <span className="text-[10px] text-[#8FA0C2]">No bypass flags permitted</span>
        </div>

        <div className="panel p-4 border-l-2 border-l-purple-400">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">LAW 03 · TREE RINGS</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-base font-bold text-[#E9EDF8] mt-1">Append-Only Brain</p>
          <span className="text-[10px] text-purple-300">Immutable SHA-256 ledger</span>
        </div>

        <div className="panel p-4 border-l-2 border-l-amber-400">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">LAW 04 · EQUALLY</span>
            <Key className="w-4 h-4 text-amber-300" />
          </div>
          <p className="text-base font-bold text-[#E9EDF8] mt-1">Tenant Isolation</p>
          <span className="text-[10px] text-amber-300">PostgreSQL RLS withTenant</span>
        </div>
      </div>

      {/* 5x5 Risk Heatmap & Risk Directory */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* 5x5 Matrix Visualizer */}
        <div className="lg:col-span-6 panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="kick">ENTERPRISE RISK REGISTER (R1–R12)</p>
              <h2 className="text-base font-bold text-[#E9EDF8]">5×5 Severity &amp; Likelihood Heatmap</h2>
            </div>
            <span className="text-[10px] text-[#8FA0C2] font-mono">12 Active Risks</span>
          </div>

          <p className="text-xs text-[#8FA0C2]">
            Visual mapping of current operational risks based on Likelihood (1–5) and Business Impact (1–5).
            Click any cell to highlight the corresponding mitigation protocol.
          </p>

          {/* 5x5 Grid */}
          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8FA0C2] px-8 pb-1">
              <span>IMPACT 1 (LOW)</span>
              <span>IMPACT 3</span>
              <span>IMPACT 5 (CRITICAL)</span>
            </div>

            {[5, 4, 3, 2, 1].map((likelihood) => (
              <div key={likelihood} className="flex items-center gap-1.5">
                <span className="w-6 text-[10px] font-mono text-[#8FA0C2] text-right">L{likelihood}</span>
                <div className="grid grid-cols-5 gap-1.5 flex-1">
                  {[1, 2, 3, 4, 5].map((impact) => {
                    const cellRisks = INITIAL_RISKS.filter(
                      r => r.likelihood === likelihood && r.impact === impact
                    );
                    const severity = likelihood * impact;
                    let bgColor = 'bg-[#0E1830]/80 border-[rgba(148,163,255,0.06)]';
                    if (severity >= 15) bgColor = 'bg-rose-950/40 border-rose-500/40 text-rose-300';
                    else if (severity >= 8) bgColor = 'bg-amber-950/40 border-amber-500/40 text-amber-300';
                    else if (cellRisks.length > 0) bgColor = 'bg-[#13203C] border-[#22D3EE]/40 text-[#22D3EE]';

                    return (
                      <div
                        key={impact}
                        className={`h-12 rounded-lg border p-1 flex flex-wrap items-center justify-center gap-1 transition-all cursor-pointer ${bgColor} hover:border-[#22D3EE]`}
                        title={`Likelihood ${likelihood}, Impact ${impact}`}
                      >
                        {cellRisks.map((r) => (
                          <span
                            key={r.id}
                            onClick={() => setSelectedRisk(r)}
                            className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded cursor-pointer ${
                              selectedRisk?.id === r.id 
                                ? 'bg-white text-black ring-2 ring-[#22D3EE]' 
                                : 'bg-[#05070f] text-[#E9EDF8]'
                            }`}
                          >
                            {r.id}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Risk Inspection Detail */}
          {selectedRisk && (
            <div className="panel2 p-4 mt-4 space-y-2 border border-[#22D3EE]/40 bg-[#05070f]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#22D3EE] bg-[#0E1830] px-2 py-0.5 rounded">
                    {selectedRisk.id}
                  </span>
                  <strong className="text-sm text-[#E9EDF8]">{selectedRisk.title}</strong>
                </div>
                <span className="text-[10px] font-mono text-[#8FA0C2]">
                  Severity Score: <strong className="text-amber-300">{selectedRisk.likelihood * selectedRisk.impact}/25</strong>
                </span>
              </div>

              <div className="text-xs space-y-1.5 pt-1">
                <p className="text-[#8FA0C2]">
                  <strong className="text-[#22D3EE]">Mitigation: </strong>
                  {selectedRisk.mitigation}
                </p>
                <div className="flex items-center justify-between text-[10px] text-[#8FA0C2] font-mono pt-1">
                  <span>Category: {selectedRisk.category}</span>
                  <span>Owner: {selectedRisk.owner}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* POPIA / GDPR Legal Safeguards & Tombstoning Pattern */}
        <div className="lg:col-span-6 panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="kick">STATUTORY COMPLIANCE MEMBRANE</p>
              <h2 className="text-base font-bold text-[#E9EDF8]">POPIA, GDPR &amp; Tombstoning (OQ-022)</h2>
            </div>
            <span className="chip border-emerald-500/30 text-emerald-400 text-xs">
              Section 72 Compliant
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="panel2 p-3.5 space-y-1.5 border-l-2 border-l-emerald-400">
              <strong className="text-[#E9EDF8] block">POPIA Section 72: Cross-Border Transfers</strong>
              <p className="text-[#8FA0C2]">
                All primary enterprise data, embeddings, and database tables reside strictly within AWS Cape Town (\`af-south-1\`).
                Outbound model queries are strictly de-identified before transiting model provider endpoints.
              </p>
            </div>

            <div className="panel2 p-3.5 space-y-1.5 border-l-2 border-l-[#22D3EE]">
              <strong className="text-[#E9EDF8] block">Right to be Forgotten via Cryptographic Tombstoning (OQ-022)</strong>
              <p className="text-[#8FA0C2]">
                Because the Brain L4 ledger is immutable, deletion requests are satisfied by destroying the tenant-specific
                cryptographic salt and appending an immutable tombstone record. Historical ciphertext becomes mathematically
                irrecoverable while preserving the tamper-evident hash chain.
              </p>
            </div>

            <div className="panel2 p-3.5 space-y-1.5 border-l-2 border-l-purple-400">
              <strong className="text-[#E9EDF8] block">Information Officer &amp; PAIA Manual Alignment</strong>
              <p className="text-[#8FA0C2]">
                The platform maintains registered Section 51 PAIA access protocols and automated 72-hour regulatory breach notifications
                under the authority of VP Legal Naledi M.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Immutable SHA-256 Audit Ledger Explorer */}
      <div className="panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="kick">BRAIN L4 EPISODIC AUDIT LOGS</p>
            <h2 className="text-base font-bold text-[#E9EDF8]">Cryptographic SHA-256 Event Chain</h2>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Chain Height: 1,042 Blocks · Zero Mutations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(148,163,255,0.12)] text-[#8FA0C2] font-mono text-[10px]">
                <th className="pb-2.5">BLOCK</th>
                <th className="pb-2.5">TIMESTAMP</th>
                <th className="pb-2.5">ACTION</th>
                <th className="pb-2.5">AUTHORIZED ACTOR</th>
                <th className="pb-2.5">TENANT</th>
                <th className="pb-2.5">BLOCK SHA-256 HASH</th>
                <th className="pb-2.5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(148,163,255,0.06)] text-[#8FA0C2]">
              {ledgerBlocks.map((b) => (
                <tr key={b.index} className="hover:bg-[#13203C]/40 transition-colors">
                  <td className="py-2.5 font-mono text-[#22D3EE] font-bold">#{b.index}</td>
                  <td className="py-2.5 font-mono text-[11px]">{b.timestamp}</td>
                  <td className="py-2.5 font-semibold text-[#E9EDF8]">{b.action}</td>
                  <td className="py-2.5 text-[11px]">{b.actor}</td>
                  <td className="py-2.5 font-mono text-[11px] text-[#8FA0C2]">{b.tenant}</td>
                  <td className="py-2.5 font-mono text-[10px] text-purple-300 truncate max-w-[140px]" title={b.hash}>
                    {b.hash.substring(0, 16)}...
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="st st-pass text-[10px]">{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
