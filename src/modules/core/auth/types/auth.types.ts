import { BaseEntity } from "@/core/types/common.types";

export type UserRole = 'admin' | 'moderator' | 'user';

export interface Profile extends BaseEntity {
  id: string;
  full_name: string;
  email: string;
}

export interface UserRoleRecord extends BaseEntity {
  user_id: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
  roles?: UserRole[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  moderator: 'Moderator',
  user: 'Bruker',
};
