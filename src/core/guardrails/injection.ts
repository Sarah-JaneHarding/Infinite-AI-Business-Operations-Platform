export interface InjectionFinding {
  rule: string;
  match: string;
}

const RULES: [string, RegExp][] = [
  ['override_instructions', /\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|above|system|earlier)\b[^.\n]{0,30}\b(instructions?|prompts?|rules?)\b/i],
  ['reveal_system_prompt', /\b(reveal|print|show|repeat|leak)\b[^.\n]{0,30}\b(system|hidden|developer)\s+(prompt|message|instructions?)\b/i],
  ['role_hijack', /\byou\s+are\s+now\b|\bact\s+as\s+(?:an?\s+)?(?:unrestricted|jailbroken|dan)\b|\bdeveloper\s+mode\b/i],
  ['bypass_controls', /\b(bypass|disable|skip|turn\s+off|override)\b[^.\n]{0,30}\b(guardrails?|approval|hitl|human\s+review|pii|audit|ledger|safety)\b/i],
  ['approval_flag', /\bSKIP_APPROVAL\b|\bAUTO_APPROVE\b|\bFORCE_APPROVE\b/],
  ['exfiltrate', /\b(send|post|upload|exfiltrate)\b[^.\n]{0,40}\b(secrets?|api\s*keys?|tokens?|passwords?|credentials?)\b/i],
];

export function detectInjection(text: string): InjectionFinding[] {
  const out: InjectionFinding[] = [];
  for (const [rule, re] of RULES) {
    const m = text.match(re);
    if (m) out.push({ rule, match: m[0] });
  }
  return out;
}
