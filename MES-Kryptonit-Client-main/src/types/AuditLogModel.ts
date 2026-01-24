export interface AuditLogUserShort {
  id: number;
  login: string;
  name: string;
  surname: string;
}

export interface AuditLogMetadata {
  ip?: string | null;
  userAgent?: string | null;
  PCId?: number | null;
  pcName?: string | null;
  pcIp?: string | null;
  // на будущее — любые доп. поля
  [key: string]: any;
}

export interface AuditLogModel {
  id: number;
  userId: number | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  description: string | null;
  metadata: AuditLogMetadata | null;
  createdAt: string;
  updatedAt: string;
  User?: AuditLogUserShort | null;
}
