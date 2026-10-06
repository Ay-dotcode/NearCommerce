// Columns that must never be copied into an audit snapshot.
const SECRET_COLUMNS = ["password_hash"];

// Returns a copy of a database row that is safe to store in admin_audit_logs.
export function auditSnapshot<T extends Record<string, unknown>>(row: T) {
  const copy: Record<string, unknown> = { ...row };
  for (const column of SECRET_COLUMNS) delete copy[column];
  return copy;
}
