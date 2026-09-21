export enum UserRole {
  CUSTOMER = "CUSTOMER",
  STORE_OWNER = "STORE_OWNER",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
}

export type PortalRole = Exclude<UserRole, UserRole.CUSTOMER>;
