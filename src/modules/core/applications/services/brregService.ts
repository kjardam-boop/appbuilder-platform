/**
 * Service for fetching company data from Brønnøysundregistrene (Brreg)
 */

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
  forretningsadresse?: {
    adresse: string[];
    postnummer: string;
    poststed: string;
    land: string;
    landkode: string;
  };
  postadresse?: {
    adresse: string[];
    postnummer: string;
    poststed: string;
    land: string;
    landkode: string;
  };
  stiftelsesdato?: string;
  hjemmeside?: string;
}

export interface SimplifiedCompanyData {
  name: string;
  org_number: string;
  org_form?: string;
  industry_code?: string;
  industry_description?: string;
  employees?: number;
  founding_date?: string;
  website?: string;
  address?: string;
  postal_code?: string;
  city?: string;
}

/**
 * Fetch company data from Brreg Enhetsregisteret API
 */
export async function fetchFromBrreg(orgNumber: string): Promise<BrregCompanyData> {
  // Remove any spaces or non-digits from org number
  const cleanOrgNumber = orgNumber.replace(/\D/g, '');
  
  if (cleanOrgNumber.length !== 9) {
    throw new Error('Organisasjonsnummer må være 9 siffer');
  }

  const response = await fetch(
    `https://data.brreg.no/enhetsregisteret/api/enheter/${cleanOrgNumber}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Fant ikke organisasjon i Brønnøysundregistrene');
    }
    throw new Error('Kunne ikke hente data fra Brønnøysundregistrene');
  }

  return response.json();
}

/**
 * Simplify Brreg data to our company format
 */
export function simplifyBrregData(brregData: BrregCompanyData): SimplifiedCompanyData {
  const address = brregData.forretningsadresse || brregData.postadresse;
  
  return {
    name: brregData.navn,
    org_number: brregData.organisasjonsnummer,
    org_form: brregData.organisasjonsform?.kode,
    industry_code: brregData.naeringskode1?.kode,
    industry_description: brregData.naeringskode1?.beskrivelse,
    employees: brregData.antallAnsatte,
    founding_date: brregData.stiftelsesdato,
    website: brregData.hjemmeside,
    address: address?.adresse.join(', '),
    postal_code: address?.postnummer,
    city: address?.poststed,
  };
}
