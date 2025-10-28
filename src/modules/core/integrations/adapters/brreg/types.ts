/**
 * Brreg Adapter Types
 */

import { IntegrationConfig } from '../../types/integration.types';

export interface BrregConfig extends IntegrationConfig {
  name: 'brreg';
  baseUrl: string;
}

export interface BrregCompanyData {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: {
    kode: string;
    beskrivelse: string;
  };
  naeringskode1?: {
    kode: string;
    beskrivelse: string;
  };
  antallAnsatte?: number;
  stiftelsesdato?: string;
  hjemmeside?: string;
  forretningsadresse?: {
    land: string;
    landkode: string;
    postnummer: string;
    poststed: string;
    adresse: string[];
    kommune: string;
    kommunenummer: string;
  };
}

export interface BrregEnhancedData extends BrregCompanyData {
  kontaktperson?: string;
  kontaktpersonRolle?: string;
  kontaktpersonTelefon?: string;
  telefonnummerKilde?: string;
  telefonnummerAlternativer?: Array<{ telefon: string; adresse: string }>;
}

export interface BrregSearchResult {
  orgNumber: string;
  name: string;
  orgForm?: string;
  industryCode?: string;
  industryDescription?: string;
  employees?: number;
  foundingDate?: string;
  website?: string;
}
