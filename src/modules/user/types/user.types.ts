import { BaseEntity } from "@/core/types/common.types";

export type UserRole = 'admin' | 'moderator' | 'user';

export interface Profile extends BaseEntity {
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
  roles: UserRole[];
}

export const USER_ROLES: Record<UserRole, string> = {
  admin: 'Administrator',
  moderator: 'Moderator',
  user: 'Bruker',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full tilgang til alle funksjoner og innstillinger',
  moderator: 'Kan moderere innhold og administrere brukere',
  user: 'Standard brukerrettigheter',
};
