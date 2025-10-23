import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Company {
  organisasjonsnummer: string;
  navn: string;
  antallAnsatte?: number;
  naeringskode1?: {
    kode: string;
    beskrivelse: string;
  };
  organisasjonsform?: {
    kode: string;
    beskrivelse: string;
  };
  overordnetEnhet?: string;
}

interface HierarchicalCompany {
  organisasjonsnummer: string;
  navn: string;
  antallAnsatte: number;
  naeringskode?: {
    kode: string;
    beskrivelse: string;
  };
  organisasjonsform?: {
    kode: string;
    beskrivelse: string;
  };
  driftsinntekter?: number;
  driftsresultat?: number;
  egenkapital?: number;
  totalkapital?: number;
  level: number;
  parentOrgNumber: string | null;
  children: HierarchicalCompany[];
  type: 'parent' | 'main' | 'sibling' | 'subsidiary';
  isManual?: boolean;
  relationshipType?: string;
}

async function fetchFinancials(orgNumber: string): Promise<{ driftsinntekter?: number; driftsresultat?: number; egenkapital?: number; totalkapital?: number }> {
  try {
    const regnskapUrl = `https://data.brreg.no/regnskapsregisteret/regnskap/${orgNumber}`;
    console.log(`Fetching financial data for: ${orgNumber}`);
    const response = await fetch(regnskapUrl);
    
    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    
    if (!data || !data.length) {
      return {};
    }

    console.log(`Filtered regnskap count: ${data.length}`);
    console.log(`Successfully fetched data from Regnskapsregisteret`);

    // Get the most recent year's data
    const latestYear = data.reduce((latest: any, current: any) => {
      return current.regnskapsperiode?.fraDato > latest.regnskapsperiode?.fraDato ? current : latest;
    }, data[0]);

    const resultatData = latestYear.resultatregnskapResultat;
    const eiendelerData = latestYear.eiendeler;
    const egenkapitalData = latestYear.egenkapitalGjeld;

    return {
      driftsinntekter: resultatData?.driftsresultat?.driftsinntekter?.sumDriftsinntekter,
      driftsresultat: resultatData?.driftsresultat?.driftsresultat,
      egenkapital: egenkapitalData?.egenkapital?.sumEgenkapital,
      totalkapital: eiendelerData?.sumEiendeler,
    };
  } catch (error) {
    console.error(`Error fetching financials for ${orgNumber}:`, error);
    return {};
  }
}

async function fetchCompanyData(orgNumber: string): Promise<Company | null> {
  try {
    const companyUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNumber}`;
    const response = await fetch(companyUrl);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching company ${orgNumber}:`, error);
    return null;
  }
}

async function findTopParent(
  orgNumber: string, 
  visited = new Set<string>(),
  manualRelationships: Map<string, any[]> = new Map()
): Promise<string> {
  if (visited.has(orgNumber)) return orgNumber;
  visited.add(orgNumber);

  const company = await fetchCompanyData(orgNumber);
  
  // Check for manual parent relationships first
  const manualParents = manualRelationships.get(orgNumber) || [];
  const manualParent = manualParents.find(rel => 
    rel.relationship_type === 'parent' || rel.relationship_type === 'holding'
  );
  
  if (manualParent && !visited.has(manualParent.related_org_number)) {
    return findTopParent(manualParent.related_org_number, visited, manualRelationships);
  }
  
  // Check Brreg parent
  if (company && company.overordnetEnhet && !visited.has(company.overordnetEnhet)) {
    return findTopParent(company.overordnetEnhet, visited, manualRelationships);
  }
  
  return orgNumber;
}

async function buildHierarchicalTree(
  orgNumber: string,
  level: number,
  parentOrgNumber: string | null,
  type: 'parent' | 'main' | 'sibling' | 'subsidiary',
  visited = new Set<string>(),
  manualRelationships: Map<string, any[]> = new Map()
): Promise<HierarchicalCompany | null> {
  
  if (visited.has(orgNumber)) {
    console.log(`Already visited ${orgNumber}, skipping to avoid cycle`);
    return null;
  }
  visited.add(orgNumber);

  const companyData = await fetchCompanyData(orgNumber);
  if (!companyData) return null;

  const financials = await fetchFinancials(orgNumber);

  const node: HierarchicalCompany = {
    organisasjonsnummer: companyData.organisasjonsnummer,
    navn: companyData.navn,
    antallAnsatte: companyData.antallAnsatte || 0,
    naeringskode: companyData.naeringskode1,
    organisasjonsform: companyData.organisasjonsform,
    ...financials,
    level,
    parentOrgNumber,
    children: [],
    type,
  };

  // Fetch automatic children (subsidiaries from Brreg)
  const subsidiariesUrl = `https://data.brreg.no/enhetsregisteret/api/underenheter?overordnetEnhet=${orgNumber}`;
  try {
    const response = await fetch(subsidiariesUrl);
    if (response.ok) {
      const data = await response.json();
      if (data._embedded?.underenheter) {
        const subsidiaries = data._embedded.underenheter
          .filter((s: Company) => s.organisasjonsform?.kode !== 'BEDR' && !visited.has(s.organisasjonsnummer));
        
        for (const sub of subsidiaries) {
          const childNode = await buildHierarchicalTree(
            sub.organisasjonsnummer,
            level - 1,
            orgNumber,
            'subsidiary',
            visited,
            manualRelationships
          );
          if (childNode) {
            node.children.push(childNode);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching subsidiaries for ${orgNumber}:`, error);
  }

  // Add manual children
  const manualChildren = manualRelationships.get(orgNumber) || [];
  for (const rel of manualChildren) {
    if (!visited.has(rel.related_org_number)) {
      const childNode = await buildHierarchicalTree(
        rel.related_org_number,
        level - 1,
        orgNumber,
        rel.relationship_type === 'subsidiary' ? 'subsidiary' : 'sibling',
        visited,
        manualRelationships
      );
      if (childNode) {
        childNode.isManual = true;
        childNode.relationshipType = rel.relationship_type;
        node.children.push(childNode);
      }
    }
  }

  return node;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orgNumber } = await req.json();
    console.log('Looking up hierarchical structure for:', orgNumber);

    const authHeader = req.headers.get('authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    if (!orgNumber || orgNumber.length !== 9) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig organisasjonsnummer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch manual relationships
    const { data: allRelationships } = await supabaseClient
      .from('company_relationships')
      .select('*');

    // Build maps for both directions
    const manualChildrenMap = new Map<string, any[]>(); // parent -> children
    const manualParentsMap = new Map<string, any[]>(); // child -> parents
    
    if (allRelationships) {
      for (const rel of allRelationships) {
        // Store child relationships
        if (rel.relationship_type === 'subsidiary') {
          const existing = manualChildrenMap.get(rel.company_org_number) || [];
          existing.push(rel);
          manualChildrenMap.set(rel.company_org_number, existing);
        } 
        
        // Store parent relationships (both for finding top parent and building tree)
        if (rel.relationship_type === 'parent' || rel.relationship_type === 'holding') {
          // Store the parent relationship for climbing up
          const existingParents = manualParentsMap.get(rel.company_org_number) || [];
          existingParents.push(rel);
          manualParentsMap.set(rel.company_org_number, existingParents);
          
          // Also create inverse relationship for building tree downwards
          const existingChildren = manualChildrenMap.get(rel.related_org_number) || [];
          existingChildren.push({ 
            ...rel, 
            company_org_number: rel.related_org_number, 
            related_org_number: rel.company_org_number, 
            relationship_type: 'subsidiary' 
          });
          manualChildrenMap.set(rel.related_org_number, existingChildren);
        }
      }
    }

    // Find the top-most parent (considering both Brreg and manual relationships)
    const topParentOrgNumber = await findTopParent(orgNumber, new Set(), manualParentsMap);
    console.log('Top parent found:', topParentOrgNumber);

    const visited = new Set<string>();

    // Build the entire tree starting from top parent
    const rootNode = await buildHierarchicalTree(
      topParentOrgNumber,
      0, // Root level
      null,
      topParentOrgNumber === orgNumber ? 'main' : 'parent',
      visited,
      manualChildrenMap
    );

    // Find the main company in the tree and mark it
    function findAndMarkMain(node: HierarchicalCompany | null, targetOrg: string): HierarchicalCompany | null {
      if (!node) return null;
      if (node.organisasjonsnummer === targetOrg) {
        node.type = 'main';
        return node;
      }
      for (const child of node.children) {
        const found = findAndMarkMain(child, targetOrg);
        if (found) return found;
      }
      return null;
    }

    if (rootNode && topParentOrgNumber !== orgNumber) {
      findAndMarkMain(rootNode, orgNumber);
    }

    // Calculate totals
    function calculateTreeTotals(node: HierarchicalCompany | null): { totalCompanies: number; totalEmployees: number } {
      if (!node) return { totalCompanies: 0, totalEmployees: 0 };
      
      let totalCompanies = 1;
      let totalEmployees = node.antallAnsatte || 0;
      
      for (const child of node.children) {
        const childTotals = calculateTreeTotals(child);
        totalCompanies += childTotals.totalCompanies;
        totalEmployees += childTotals.totalEmployees;
      }
      
      return { totalCompanies, totalEmployees };
    }

    const totals = calculateTreeTotals(rootNode);

    console.log('Hierarchical structure complete:', totals);

    return new Response(
      JSON.stringify({ 
        hierarchy: rootNode,
        totals
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in brreg-konsern-lookup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Ukjent feil' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
