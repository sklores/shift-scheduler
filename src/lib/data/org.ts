// Multi-tenant org stamp for Supabase writes.
//
// NEXT_PUBLIC_ORG_ID unset  → single-tenant DB (original And-Done-Backend):
//   rows have no org_id column and payloads pass through untouched.
// NEXT_PUBLIC_ORG_ID set    → multi-tenant DB (DashVue core): every insert
//   must carry org_id — the columns are NOT NULL with no default, and RLS
//   scopes rows by org membership.
export const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? '';

export function withOrg<T extends Record<string, unknown>>(row: T): T {
  return ORG_ID ? { ...row, org_id: ORG_ID } : row;
}
