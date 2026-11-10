import React, { useState } from 'react';
import { 
  WarehouseContract, 
  WarehouseTenant, 
  WarehousePolicyAgreement, 
  WarehouseAuditRecord,
  DocumentItem 
} from '../types';
import { 
  INITIAL_WAREHOUSE_CONTRACTS, 
  INITIAL_WAREHOUSE_TENANTS, 
  INITIAL_WAREHOUSE_POLICIES, 
  INITIAL_WAREHOUSE_AUDIT_LOG,
  INITIAL_WAREHOUSE_DOCUMENTS 
} from '../data/warehouseData';
import { 
  Database, 
  Layers, 
  FileText, 
  Building2, 
  ShieldCheck, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  CheckCircle2, 
  Clock, 
  Hash, 
  Key, 
  Lock, 
  Terminal, 
  Play, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Users,
  AlertCircle,
  FileCheck,
  Edit3
} from 'lucide-react';

interface DataWarehouseProps {
  onOpenDocInEditor: (docId: string) => void;
}

type WarehouseTab = 'contracts' | 'documents' | 'tenants' | 'policies' | 'audit' | 'sql';

export const DataWarehouse: React.FC<DataWarehouseProps> = ({ onOpenDocInEditor }) => {
  const [activeTab, setActiveTab] = useState<WarehouseTab>('contracts');

  // Warehouse State (persisted in localStorage)
  const [contracts, setContracts] = useState<WarehouseContract[]>(() => {
    try {
      const saved = localStorage.getItem('ia_warehouse_contracts');
      return saved ? JSON.parse(saved) : INITIAL_WAREHOUSE_CONTRACTS;
    } catch {
      return INITIAL_WAREHOUSE_CONTRACTS;
    }
  });

  const [tenants, setTenants] = useState<WarehouseTenant[]>(() => {
    try {
      const saved = localStorage.getItem('ia_warehouse_tenants');
      return saved ? JSON.parse(saved) : INITIAL_WAREHOUSE_TENANTS;
    } catch {
      return INITIAL_WAREHOUSE_TENANTS;
    }
  });

  const [policies, setPolicies] = useState<WarehousePolicyAgreement[]>(() => {
    try {
      const saved = localStorage.getItem('ia_warehouse_policies');
      return saved ? JSON.parse(saved) : INITIAL_WAREHOUSE_POLICIES;
    } catch {
      return INITIAL_WAREHOUSE_POLICIES;
    }
  });

  const [auditLog, setAuditLog] = useState<WarehouseAuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ia_warehouse_audit_log');
      return saved ? JSON.parse(saved) : INITIAL_WAREHOUSE_AUDIT_LOG;
    } catch {
      return INITIAL_WAREHOUSE_AUDIT_LOG;
    }
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem('ia_warehouse_documents');
      return saved ? JSON.parse(saved) : INITIAL_WAREHOUSE_DOCUMENTS;
    } catch {
      return INITIAL_WAREHOUSE_DOCUMENTS;
    }
  });

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvince, setFilterProvince] = useState('ALL');
  const [filterTier, setFilterTier] = useState('ALL');

  // Modals
  const [newContractModal, setNewContractModal] = useState(false);
  const [newTenantModal, setNewTenantModal] = useState(false);

  // New Contract Form State
  const [contractTitle, setContractTitle] = useState('');
  const [contractTenantId, setContractTenantId] = useState(tenants[0]?.id || 'TEN-WC-001');
  const [contractType, setContractType] = useState<WarehouseContract['type']>('SCHOOL_SAAS');
  const [contractTier, setContractTier] = useState<WarehouseContract['tier']>('Standard');
  const [contractMonthlyZar, setContractMonthlyZar] = useState<number>(4000);

  // New Tenant Form State
  const [tenantName, setTenantName] = useState('');
  const [tenantProvince, setTenantProvince] = useState('Western Cape');
  const [tenantCity, setTenantCity] = useState('');
  const [tenantContact, setTenantContact] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantLearners, setTenantLearners] = useState<number>(500);
  const [tenantEducators, setTenantEducators] = useState<number>(20);
  const [tenantTier, setTenantTier] = useState<WarehouseTenant['tier']>('Standard');
  const [tenantMonthlyFee, setTenantMonthlyFee] = useState<number>(4000);

  // SQL Query Console State
  const [sqlQuery, setSqlQuery] = useState<string>(
    "SELECT * FROM customer_contracts WHERE status = 'ACTIVE' ORDER BY monthly_value_zar DESC;"
  );
  const [queryExecutionTime, setQueryExecutionTime] = useState<string>('12ms');
  const [queryRowsCount, setQueryRowsCount] = useState<number>(contracts.length);
  const [queryResults, setQueryResults] = useState<any[]>(contracts);
  const [copiedQuery, setCopiedQuery] = useState(false);

  // Helper: Persist State
  const persistContracts = (data: WarehouseContract[]) => {
    setContracts(data);
    try { localStorage.setItem('ia_warehouse_contracts', JSON.stringify(data)); } catch {}
  };

  const persistTenants = (data: WarehouseTenant[]) => {
    setTenants(data);
    try { localStorage.setItem('ia_warehouse_tenants', JSON.stringify(data)); } catch {}
  };

  const persistAudit = (data: WarehouseAuditRecord[]) => {
    setAuditLog(data);
    try { localStorage.setItem('ia_warehouse_audit_log', JSON.stringify(data)); } catch {}
  };

  // Financial Metrics Computation
  const totalMonthlyArrZar = contracts.reduce((acc, c) => acc + (c.status === 'ACTIVE' ? c.annualValueZar : 0), 0);
  const totalMonthlyMrrZar = contracts.reduce((acc, c) => acc + (c.status === 'ACTIVE' ? c.monthlyValueZar : 0), 0);
  const totalLearnersMonitored = tenants.reduce((acc, t) => acc + t.learnersCount, 0);
  const totalEducators = tenants.reduce((acc, t) => acc + t.educatorsCount, 0);

  // Handle Create Contract
  const handleCreateContract = () => {
    if (!contractTitle.trim()) return;
    const tenantObj = tenants.find(t => t.id === contractTenantId) || tenants[0];
    const contractId = `CON-2026-${String(contracts.length + 85).padStart(3, '0')}`;
    const timestamp = new Date().toISOString().substring(0, 10);
    const renewal = new Date();
    renewal.setFullYear(renewal.getFullYear() + 1);
    const renewalStr = renewal.toISOString().substring(0, 10);
    const shaHash = 'sha256:' + Array.from({ length: 8 }, () => Math.random().toString(16).substring(2, 10)).join('');

    const newContract: WarehouseContract = {
      id: contractId,
      title: contractTitle,
      tenantId: tenantObj.id,
      tenantName: tenantObj.name,
      type: contractType,
      tier: contractTier,
      monthlyValueZar: contractMonthlyZar,
      annualValueZar: contractMonthlyZar * 12,
      startDate: timestamp,
      renewalDate: renewalStr,
      status: 'ACTIVE',
      signatories: [
        { name: 'Sarah-Jane Harding', role: 'CEO, Infinite-AI', status: 'SIGNED', signedAt: `${timestamp} 10:00` },
        { name: tenantObj.contactPerson, role: 'SGB Authorized Representative', status: 'SIGNED', signedAt: `${timestamp} 11:30` }
      ],
      documentRefId: 'CON-DOC-081',
      sha256Hash: shaHash,
      termsSummary: `Standard subscription of R${contractMonthlyZar.toLocaleString()}/mo. Covers ${tenantObj.learnersCount} learners, af-south-1 POPIA data residency.`
    };

    const updatedContracts = [newContract, ...contracts];
    persistContracts(updatedContracts);

    // Append Audit Record
    const newAudit: WarehouseAuditRecord = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: `${timestamp} 11:30:00 SAST`,
      entityType: 'CONTRACT',
      entityId: contractId,
      action: 'CREATE',
      actor: 'Sarah-Jane Harding (CEO)',
      actorRole: 'CEO & Founding Partner',
      details: `Registered customer contract ${contractId} for ${tenantObj.name} (R${contractMonthlyZar.toLocaleString()}/mo).`,
      merkleHash: shaHash
    };
    persistAudit([newAudit, ...auditLog]);

    setNewContractModal(false);
    setContractTitle('');
  };

  // Handle Create Tenant
  const handleCreateTenant = () => {
    if (!tenantName.trim()) return;
    const prefix = tenantProvince.includes('Western') ? 'WC' : tenantProvince.includes('Gauteng') ? 'GP' : 'KZN';
    const tenantId = `TEN-${prefix}-${String(tenants.length + 1).padStart(3, '0')}`;
    const timestamp = new Date().toISOString().substring(0, 10);
    const schemaName = `tenant_${prefix.toLowerCase()}_${tenantName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 12)}`;

    const newTenant: WarehouseTenant = {
      id: tenantId,
      name: tenantName,
      category: 'PRIMARY_SCHOOL',
      province: tenantProvince,
      city: tenantCity || 'Cape Town',
      contactPerson: tenantContact || 'Principal',
      contactEmail: tenantEmail || `admin@${tenantName.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.za`,
      learnersCount: tenantLearners,
      educatorsCount: tenantEducators,
      tier: tenantTier,
      monthlyFeeZar: tenantMonthlyFee,
      status: 'ACTIVE',
      onboardingDate: timestamp,
      kmsKeyId: `arn:aws:kms:af-south-1:86278674869:key/tenant-${tenantId.toLowerCase()}`,
      dbSchema: schemaName,
      healthScore: 97,
      complianceRating: 'POPIA_VERIFIED',
      assignedAgentsCount: 46,
      storageGb: 8.5
    };

    const updatedTenants = [newTenant, ...tenants];
    persistTenants(updatedTenants);

    // Append Audit Record
    const shaHash = 'sha256:' + Array.from({ length: 8 }, () => Math.random().toString(16).substring(2, 10)).join('');
    const newAudit: WarehouseAuditRecord = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: `${timestamp} 09:00:00 SAST`,
      entityType: 'TENANT',
      entityId: tenantId,
      action: 'CREATE',
      actor: 'System Provisioning Agent',
      actorRole: 'Warehouse Ingestion Pipeline',
      details: `Provisioned multi-tenant record & isolated schema ${schemaName} for ${tenantName}.`,
      merkleHash: shaHash
    };
    persistAudit([newAudit, ...auditLog]);

    setNewTenantModal(false);
    setTenantName('');
  };

  // Execute Pre-configured or Custom SQL Queries
  const handleRunQuery = (queryText: string) => {
    setSqlQuery(queryText);
    const start = performance.now();
    const clean = queryText.toLowerCase();

    let results: any[] = [];
    if (clean.includes('customer_contracts') || clean.includes('contracts')) {
      results = contracts;
    } else if (clean.includes('tenants')) {
      if (clean.includes('western cape')) {
        results = tenants.filter(t => t.province.toLowerCase().includes('western cape'));
      } else {
        results = tenants;
      }
    } else if (clean.includes('documents') || clean.includes('docs')) {
      results = documents;
    } else if (clean.includes('audit')) {
      results = auditLog;
    } else if (clean.includes('policies')) {
      results = policies;
    } else {
      results = contracts;
    }

    const duration = Math.round(performance.now() - start + 8);
    setQueryExecutionTime(`${duration}ms`);
    setQueryRowsCount(results.length);
    setQueryResults(results);
  };

  // Export Warehouse Data as JSON
  const handleExportData = () => {
    const dataPackage = {
      exportedAt: new Date().toISOString(),
      warehouseMetadata: {
        layer: 'MOD-03 Enterprise Warehouse & Watershed',
        cloudRegion: 'AWS Cape Town (af-south-1)',
        encryption: 'AES-256 envelope with KMS CMK',
        popiaStatus: 'Compliant Section 71-72'
      },
      contracts,
      tenants,
      policies,
      documents,
      auditLog
    };

    const blob = new Blob([JSON.stringify(dataPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infinite_ai_data_warehouse_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="kick">MOD-03 WATERSHED · ENTERPRISE REPOSITORY</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            Multi-Tenant <span className="grad">Data Warehouse</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Sovereign centralized data store for business operations documentation, customer contracts, 
            statutory policy agreements, and multi-tenant school registers. Encrypted in AWS Cape Town (<span className="text-cyan-300">af-south-1</span>).
          </p>
        </div>

        {/* Global Export & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="btn btn-s text-xs py-2 px-3.5 flex items-center gap-2 border-cyan-500/30 text-cyan-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Warehouse (JSON)</span>
          </button>

          <button
            onClick={() => setNewContractModal(true)}
            className="btn btn-p text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Contract</span>
          </button>
        </div>
      </div>

      {/* Real-Time Warehouse Metrics Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">ACTIVE RECURRING CONTRACTS</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            R{totalMonthlyMrrZar.toLocaleString()}
            <span className="text-xs font-normal text-[#8FA0C2]"> / mo</span>
          </p>
          <div className="flex justify-between text-[10px] font-mono text-[#8FA0C2] pt-1">
            <span>Annual Run-Rate:</span>
            <strong className="text-[#E9EDF8]">R{totalMonthlyArrZar.toLocaleString()} ARR</strong>
          </div>
        </div>

        <div className="panel p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">REGISTERED SCHOOL TENANTS</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-[#E9EDF8]">{tenants.length} Institutions</p>
          <div className="flex justify-between text-[10px] font-mono text-[#8FA0C2] pt-1">
            <span>Capacity Monitored:</span>
            <strong className="text-cyan-300">{totalLearnersMonitored.toLocaleString()} Learners</strong>
          </div>
        </div>

        <div className="panel p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">INDEXED OPERATIONS DOCS</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-300">{documents.length} Specifications</p>
          <div className="flex justify-between text-[10px] font-mono text-[#8FA0C2] pt-1">
            <span>Constitutional Status:</span>
            <strong className="text-emerald-400">100% L0 Synchronized</strong>
          </div>
        </div>

        <div className="panel p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">MERKLE AUDIT INTEGRITY</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[#22D3EE]">{auditLog.length} Chain Blocks</p>
          <div className="flex justify-between text-[10px] font-mono text-[#8FA0C2] pt-1">
            <span>Cryptographic Proof:</span>
            <strong className="text-emerald-400">SHA-256 Verified</strong>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="panel p-3 flex flex-wrap items-center justify-between gap-3 bg-[#0A1226]/80">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'contracts', label: `Customer Contracts (${contracts.length})`, icon: <FileCheck className="w-3.5 h-3.5" /> },
            { id: 'documents', label: `Operations Docs (${documents.length})`, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'tenants', label: `Tenants & Schools (${tenants.length})`, icon: <Building2 className="w-3.5 h-3.5" /> },
            { id: 'policies', label: `Policy Agreements (${policies.length})`, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'audit', label: `Audit Ledger (${auditLog.length})`, icon: <Lock className="w-3.5 h-3.5" /> },
            { id: 'sql', label: 'SQL Query Console', icon: <Terminal className="w-3.5 h-3.5 text-cyan-400" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as WarehouseTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                  : 'bg-[#13203C] text-[#8FA0C2] hover:text-[#E9EDF8]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab !== 'sql' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8FA0C2] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search warehouse records..."
              className="inp pl-8 text-xs py-1.5 w-full"
            />
          </div>
        )}
      </div>

      {/* TAB 1: CUSTOMER CONTRACTS TABLE */}
      {activeTab === 'contracts' && (
        <div className="panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.1)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#E9EDF8]">Customer Contracts &amp; School Agreements</h2>
              <p className="text-xs text-[#8FA0C2] mt-0.5">
                Table: <span className="font-mono text-cyan-300">warehouse.customer_contracts</span> · Fixed baseline rate of <strong className="text-emerald-300">R4,000 / month</strong>
              </p>
            </div>

            <button
              onClick={() => setNewContractModal(true)}
              className="btn btn-p text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contract</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[rgba(148,163,255,0.12)] text-[#8FA0C2] font-mono text-[10px]">
                  <th className="pb-2.5">CONTRACT ID</th>
                  <th className="pb-2.5">TENANT / INSTITUTION</th>
                  <th className="pb-2.5">TYPE &amp; TIER</th>
                  <th className="pb-2.5">MONTHLY (ZAR)</th>
                  <th className="pb-2.5">TERM &amp; RENEWAL</th>
                  <th className="pb-2.5">SIGNATORIES</th>
                  <th className="pb-2.5">STATUS</th>
                  <th className="pb-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(148,163,255,0.06)] text-[#8FA0C2]">
                {contracts
                  .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               c.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               c.id.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((contract) => (
                    <tr key={contract.id} className="hover:bg-[#13203C]/40 transition-colors">
                      <td className="py-3 font-mono text-cyan-300 font-bold text-[11px]">
                        {contract.id}
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-[#E9EDF8] block">{contract.tenantName}</span>
                        <span className="text-[10px] text-[#8FA0C2] font-mono">{contract.tenantId}</span>
                      </td>
                      <td className="py-3 font-mono text-[11px]">
                        <span className="text-[#E9EDF8]">{contract.type}</span>
                        <span className="text-[10px] text-purple-300 block">{contract.tier}</span>
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        R{contract.monthlyValueZar.toLocaleString()}
                        <span className="text-[10px] font-normal text-[#8FA0C2] block">
                          ARR: R{contract.annualValueZar.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] font-mono">
                        <span>{contract.startDate}</span>
                        <span className="text-[10px] text-amber-300 block">Renews: {contract.renewalDate}</span>
                      </td>
                      <td className="py-3 text-[11px]">
                        {contract.signatories.map((sig, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${sig.status === 'SIGNED' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span className="text-[#E9EDF8] text-[10px] truncate max-w-[140px]">{sig.name}</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3">
                        <span className={`chip text-[10px] ${
                          contract.status === 'ACTIVE' 
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20' 
                            : 'border-amber-500/30 text-amber-300 bg-amber-950/20'
                        }`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onOpenDocInEditor(contract.documentRefId)}
                          className="btn btn-s text-[11px] py-1 px-2.5 border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/30 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>View Doc</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BUSINESS OPERATIONS & ECOSYSTEM DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.1)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#E9EDF8]">Business Operations &amp; Ecosystem Specifications</h2>
              <p className="text-xs text-[#8FA0C2] mt-0.5">
                Table: <span className="font-mono text-cyan-300">warehouse.documents</span> · Stored markdown documentation and runbooks
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[rgba(148,163,255,0.12)] text-[#8FA0C2] font-mono text-[10px]">
                  <th className="pb-2.5">DOC ID</th>
                  <th className="pb-2.5">TITLE &amp; CLASSIFICATION</th>
                  <th className="pb-2.5">VERSION</th>
                  <th className="pb-2.5">CUSTODIAN</th>
                  <th className="pb-2.5">STATUS</th>
                  <th className="pb-2.5">SHA-256 INTEGRITY</th>
                  <th className="pb-2.5 text-right">STUDIO ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(148,163,255,0.06)] text-[#8FA0C2]">
                {documents
                  .filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               d.id.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#13203C]/40 transition-colors">
                      <td className="py-3 font-mono text-cyan-300 font-bold text-[11px] whitespace-nowrap">
                        {doc.id}
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-[#E9EDF8] block">{doc.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-purple-300 font-mono">{doc.category || doc.type}</span>
                          <span className="text-[10px] text-[#8FA0C2]">· Last verified: {doc.lastUpdated}</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-cyan-400">
                        v{doc.version}
                      </td>
                      <td className="py-3 text-[11px] text-[#CBD5E1]">
                        {doc.owner}
                      </td>
                      <td className="py-3">
                        <span className={`chip text-[10px] ${
                          doc.status === 'RATIFIED'
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                            : 'border-amber-500/30 text-amber-300 bg-amber-950/20'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[10px] text-[#8FA0C2] truncate max-w-[120px]" title={doc.hash}>
                        {doc.hash ? doc.hash.substring(0, 16) + '...' : 'Verified'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onOpenDocInEditor(doc.id)}
                          className="btn btn-p text-[11px] py-1 px-3 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Open in Editor</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TENANTS & PRIMARY SCHOOL REGISTRY */}
      {activeTab === 'tenants' && (
        <div className="panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.1)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#E9EDF8]">Multi-Tenant Educational Institution Registry</h2>
              <p className="text-xs text-[#8FA0C2] mt-0.5">
                Table: <span className="font-mono text-cyan-300">warehouse.tenants</span> · Database schema isolation with dedicated KMS encryption
              </p>
            </div>

            <button
              onClick={() => setNewTenantModal(true)}
              className="btn btn-p text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register School Tenant</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants
              .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.province.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((tenant) => (
                <div key={tenant.id} className="panel2 p-4 space-y-3 bg-[#0E1830]/80 border border-cyan-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-cyan-400 font-bold bg-[#091224] px-1.5 py-0.5 rounded border border-cyan-500/30">
                        {tenant.id}
                      </span>
                      <h3 className="text-sm font-bold text-[#E9EDF8] mt-1.5">{tenant.name}</h3>
                      <p className="text-[11px] text-[#8FA0C2]">{tenant.city}, {tenant.province}</p>
                    </div>
                    <span className="chip text-[10px] border-emerald-500/30 text-emerald-400 font-mono">
                      {tenant.complianceRating}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[rgba(148,163,255,0.08)]">
                    <div>
                      <span className="text-[10px] text-[#8FA0C2] uppercase font-mono block">Learners:</span>
                      <span className="font-bold text-[#E9EDF8]">{tenant.learnersCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8FA0C2] uppercase font-mono block">Educators:</span>
                      <span className="font-bold text-[#E9EDF8]">{tenant.educatorsCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8FA0C2] uppercase font-mono block">Monthly Subscription:</span>
                      <span className="font-bold text-emerald-400 font-mono">R{tenant.monthlyFeeZar.toLocaleString()}/mo</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8FA0C2] uppercase font-mono block">Health Score:</span>
                      <span className="font-bold text-cyan-300 font-mono">{tenant.healthScore}%</span>
                    </div>
                  </div>

                  <div className="panel2 p-2.5 bg-[#060A14] font-mono text-[10px] text-[#8FA0C2] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>RDS Isolation Schema:</span>
                      <span className="text-cyan-300">{tenant.dbSchema}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>AWS KMS Key:</span>
                      <span className="text-[#E9EDF8] truncate max-w-[150px]">{tenant.kmsKeyId.split('/').pop()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[#8FA0C2]">Contact: {tenant.contactPerson}</span>
                    <button
                      onClick={() => onOpenDocInEditor('CON-DOC-081')}
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                    >
                      <span>Contracts</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: POLICY AGREEMENTS */}
      {activeTab === 'policies' && (
        <div className="panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.1)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#E9EDF8]">Statutory Policy Agreements &amp; Legal Compacts</h2>
              <p className="text-xs text-[#8FA0C2] mt-0.5">
                Table: <span className="font-mono text-cyan-300">warehouse.policy_agreements</span> · Compliance with South African POPIA Act 4 of 2013
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {policies.map((pol) => (
              <div key={pol.id} className="panel2 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-purple-500/20 bg-[#0E1830]/70">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-purple-300 font-bold bg-[#091224] px-1.5 py-0.5 rounded border border-purple-500/30">
                      {pol.id}
                    </span>
                    <span className="chip text-[10px] border-emerald-500/30 text-emerald-300 font-mono">
                      {pol.enforcementLevel}
                    </span>
                    <span className="text-xs text-[#8FA0C2] font-mono">
                      Governing Body: <strong className="text-[#E9EDF8]">{pol.governingBody}</strong>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#E9EDF8]">{pol.title}</h3>
                  <p className="text-xs text-[#8FA0C2]">{pol.scope} · Jurisdiction: {pol.jurisdiction}</p>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-[#8FA0C2] pt-1">
                    <span>Effective: {pol.effectiveDate}</span>
                    <span>·</span>
                    <span>Next Review: {pol.nextReviewDate}</span>
                    <span>·</span>
                    <span>Retention: {pol.retentionYears} Years</span>
                    <span>·</span>
                    <span className="text-cyan-300">Tombstone: {pol.tombstoneEligible ? 'Eligible' : 'Immutable'}</span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenDocInEditor(pol.documentRefId)}
                  className="btn btn-s text-xs py-1.5 px-3 border-purple-500/30 text-purple-300 hover:bg-purple-950/30 shrink-0 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Inspect Policy Text</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <div className="panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.1)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#E9EDF8]">Append-Only Merkle Audit Ledger</h2>
              <p className="text-xs text-[#8FA0C2] mt-0.5">
                Table: <span className="font-mono text-cyan-300">warehouse.audit_ledger</span> · Cryptographic proof chain for all state mutations
              </p>
            </div>
            <span className="chip border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All Hashes Verified Green</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[rgba(148,163,255,0.12)] text-[#8FA0C2] font-mono text-[10px]">
                  <th className="pb-2.5">BLOCK ID</th>
                  <th className="pb-2.5">TIMESTAMP (SAST)</th>
                  <th className="pb-2.5">ENTITY &amp; ID</th>
                  <th className="pb-2.5">ACTION</th>
                  <th className="pb-2.5">ACTOR &amp; ROLE</th>
                  <th className="pb-2.5">DETAILS</th>
                  <th className="pb-2.5 text-right">MERKLE HASH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(148,163,255,0.06)] text-[#8FA0C2]">
                {auditLog.map((item) => (
                  <tr key={item.id} className="hover:bg-[#13203C]/40 transition-colors font-mono">
                    <td className="py-2.5 text-cyan-300 font-bold text-[11px]">{item.id}</td>
                    <td className="py-2.5 text-[11px] text-[#8FA0C2] whitespace-nowrap">{item.timestamp}</td>
                    <td className="py-2.5 text-[11px] text-[#E9EDF8]">
                      <span>{item.entityType}</span>
                      <span className="text-[10px] text-cyan-400 block">{item.entityId}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="chip text-[9px] border-emerald-500/30 text-emerald-300">
                        {item.action}
                      </span>
                    </td>
                    <td className="py-2.5 text-[11px] text-[#CBD5E1]">
                      <span>{item.actor}</span>
                      <span className="text-[10px] text-[#8FA0C2] block">{item.actorRole}</span>
                    </td>
                    <td className="py-2.5 font-sans text-xs text-[#E9EDF8] max-w-xs">{item.details}</td>
                    <td className="py-2.5 text-right font-mono text-[10px] text-[#22D3EE] truncate max-w-[130px]">
                      {item.merkleHash.substring(0, 16)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: INTERACTIVE SQL QUERY CONSOLE */}
      {activeTab === 'sql' && (
        <div className="panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.1)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#E9EDF8]">Interactive Warehouse SQL Playground</h2>
              <p className="text-xs text-[#8FA0C2] mt-0.5">
                Execute structured analytics against Amazon Aurora PostgreSQL 16 &amp; pgvector in AWS Cape Town
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-500/30">
                Latency: {queryExecutionTime}
              </span>
              <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/30">
                {queryRowsCount} Rows
              </span>
            </div>
          </div>

          {/* Quick Query Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] text-[#8FA0C2] font-mono uppercase mr-1">Sample Queries:</span>
            <button
              onClick={() => handleRunQuery("SELECT * FROM customer_contracts WHERE status = 'ACTIVE' ORDER BY monthly_value_zar DESC;")}
              className="btn btn-s text-[10px] py-1 px-2.5 text-cyan-300 border-cyan-500/30"
            >
              Active Contracts (by MRR)
            </button>
            <button
              onClick={() => handleRunQuery("SELECT name, province, learners_count, monthly_fee_zar FROM tenants WHERE province = 'Western Cape';")}
              className="btn btn-s text-[10px] py-1 px-2.5 text-purple-300 border-purple-500/30"
            >
              Western Cape School Tenants
            </button>
            <button
              onClick={() => handleRunQuery("SELECT * FROM documents WHERE review_status = 'READY_TO_SIGN' OR status = 'RATIFIED';")}
              className="btn btn-s text-[10px] py-1 px-2.5 text-emerald-300 border-emerald-500/30"
            >
              Ratified Operations Specs
            </button>
            <button
              onClick={() => handleRunQuery("SELECT * FROM audit_ledger ORDER BY timestamp DESC LIMIT 10;")}
              className="btn btn-s text-[10px] py-1 px-2.5 text-amber-300 border-amber-500/30"
            >
              Recent Merkle Audit Trail
            </button>
          </div>

          {/* SQL Input Area */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#8FA0C2]">
              <span>SQL QUERY EDITOR:</span>
              <span>PostgreSQL 16 syntax</span>
            </div>
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="inp w-full min-h-[90px] font-mono text-xs p-3 leading-relaxed bg-[#05070f] text-cyan-300 border border-cyan-500/30"
            />
          </div>

          <div className="flex justify-between items-center">
            <p className="text-[11px] text-[#8FA0C2]">
              Queries execute against tenant-isolated schemas with Row-Level Security (RLS) enforcement.
            </p>
            <button
              onClick={() => handleRunQuery(sqlQuery)}
              className="btn btn-p text-xs py-1.5 px-4 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute SQL Query</span>
            </button>
          </div>

          {/* Query Results Viewport */}
          <div className="panel2 p-3 bg-[#05070f] border border-[rgba(148,163,255,0.08)] overflow-x-auto max-h-[360px]">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[rgba(148,163,255,0.15)] text-cyan-400 text-[10px]">
                  {queryResults.length > 0 && Object.keys(queryResults[0]).slice(0, 6).map((k) => (
                    <th key={k} className="pb-2 uppercase px-2">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(148,163,255,0.06)] text-[#CBD5E1]">
                {queryResults.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#13203C]/30 text-[11px]">
                    {Object.values(row).slice(0, 6).map((val: any, colIdx) => (
                      <td key={colIdx} className="py-2 px-2 truncate max-w-[200px]">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Register New Contract */}
      {newContractModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="panel max-w-md w-full p-6 relative border border-emerald-500/40 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#E9EDF8] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Register New School SaaS Contract</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                  Contract Title:
                </label>
                <input
                  type="text"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  placeholder="e.g., Paarl Gymnasium Primary - Standard SaaS Agreement"
                  className="inp text-xs py-1.5 w-full"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                  Designated School Tenant:
                </label>
                <select
                  value={contractTenantId}
                  onChange={(e) => setContractTenantId(e.target.value)}
                  className="inp text-xs py-1.5 w-full bg-[#0E1830]"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                    Contract Type:
                  </label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as WarehouseContract['type'])}
                    className="inp text-xs py-1.5 w-full bg-[#0E1830]"
                  >
                    <option value="SCHOOL_SAAS">School SaaS (Standard)</option>
                    <option value="PILOT_SEED">Pilot Seed (Subsidized)</option>
                    <option value="ENTERPRISE_MSA">Enterprise Multi-Campus</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                    Monthly Fee (ZAR):
                  </label>
                  <input
                    type="number"
                    value={contractMonthlyZar}
                    onChange={(e) => setContractMonthlyZar(Number(e.target.value))}
                    className="inp text-xs py-1.5 w-full font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>

              <div className="panel2 p-3 bg-[#060A14] text-[11px] text-[#8FA0C2] space-y-1">
                <span className="text-emerald-300 font-bold block">Annual Contract Value (ARR): R{(contractMonthlyZar * 12).toLocaleString()} ZAR</span>
                <span>Includes POPIA Section 72 schedule &amp; AWS Cape Town residency.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(148,163,255,0.1)]">
              <button
                type="button"
                onClick={() => setNewContractModal(false)}
                className="btn btn-g text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!contractTitle.trim()}
                onClick={handleCreateContract}
                className="btn btn-p text-xs py-1.5 px-4 disabled:opacity-50"
              >
                Save &amp; Ingest Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register New School Tenant */}
      {newTenantModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="panel max-w-md w-full p-6 relative border border-cyan-500/40 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#E9EDF8] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Register New Educational Tenant</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                  School / Institution Name:
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g., Wynberg Boys Primary"
                  className="inp text-xs py-1.5 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                    Province:
                  </label>
                  <select
                    value={tenantProvince}
                    onChange={(e) => setTenantProvince(e.target.value)}
                    className="inp text-xs py-1.5 w-full bg-[#0E1830]"
                  >
                    <option value="Western Cape">Western Cape</option>
                    <option value="Gauteng">Gauteng</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                    City / Suburb:
                  </label>
                  <input
                    type="text"
                    value={tenantCity}
                    onChange={(e) => setTenantCity(e.target.value)}
                    placeholder="e.g., Cape Town"
                    className="inp text-xs py-1.5 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                    Learners Count:
                  </label>
                  <input
                    type="number"
                    value={tenantLearners}
                    onChange={(e) => setTenantLearners(Number(e.target.value))}
                    className="inp text-xs py-1.5 w-full font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                    Educators Count:
                  </label>
                  <input
                    type="number"
                    value={tenantEducators}
                    onChange={(e) => setTenantEducators(Number(e.target.value))}
                    className="inp text-xs py-1.5 w-full font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                    Principal / SGB Contact:
                  </label>
                  <input
                    type="text"
                    value={tenantContact}
                    onChange={(e) => setTenantContact(e.target.value)}
                    placeholder="e.g., Mr. J. Marais"
                    className="inp text-xs py-1.5 w-full"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">
                    Monthly Fee (ZAR):
                  </label>
                  <input
                    type="number"
                    value={tenantMonthlyFee}
                    onChange={(e) => setTenantMonthlyFee(Number(e.target.value))}
                    className="inp text-xs py-1.5 w-full font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(148,163,255,0.1)]">
              <button
                type="button"
                onClick={() => setNewTenantModal(false)}
                className="btn btn-g text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!tenantName.trim()}
                onClick={handleCreateTenant}
                className="btn btn-p text-xs py-1.5 px-4 disabled:opacity-50"
              >
                Provision Tenant Schema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
