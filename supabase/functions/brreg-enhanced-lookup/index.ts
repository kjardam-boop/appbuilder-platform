import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orgNumber, companyName } = await req.json();
    console.log('Looking up organization:', orgNumber || companyName);

    // Validate that we have either orgNumber or companyName
    if (!orgNumber && !companyName) {
      return new Response(
        JSON.stringify({ error: 'Må oppgi enten organisasjonsnummer eller bedriftsnavn' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalOrgNumber = orgNumber;

    // If companyName is provided, search for the organization first
    if (companyName && !orgNumber) {
      console.log('Searching by company name:', companyName);
      
      const searchUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(companyName)}`;
      console.log('Searching Brreg:', searchUrl);
      
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        console.error('Brreg search failed:', searchResponse.status);
        return new Response(
          JSON.stringify({ error: 'Feil ved søk etter bedrift' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const searchData = await searchResponse.json();
      console.log('Search results:', searchData);

      if (!searchData._embedded?.enheter || searchData._embedded.enheter.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Ingen bedrifter funnet med det navnet' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      finalOrgNumber = searchData._embedded.enheter[0].organisasjonsnummer;
      console.log('Found organization number:', finalOrgNumber);
    }

    // Validate orgNumber format
    if (!finalOrgNumber || finalOrgNumber.length !== 9) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig organisasjonsnummer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Brreg API
    const brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${finalOrgNumber}`;
    console.log('Calling Brreg API:', brregUrl);

    const brregResponse = await fetch(brregUrl);

    if (!brregResponse.ok) {
      if (brregResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Organisasjon ikke funnet' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('Brreg API error:', brregResponse.status);
      return new Response(
        JSON.stringify({ error: 'Feil ved oppslag i Brreg' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await brregResponse.json();
    console.log('Brreg data received:', data.navn);
    console.log('Stiftelsesdato from Brreg:', data.stiftelsesdato);

    // Fetch roles to get daglig leder or styreformann
    let kontaktperson = '';
    let kontaktpersonRolle = '';
    const rollerUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${finalOrgNumber}/roller`;
    console.log('Fetching roles from:', rollerUrl);
    
    try {
      const rollerResponse = await fetch(rollerUrl);
      console.log('Roller response status:', rollerResponse.status);
      
      if (rollerResponse.ok) {
        const rollerData = await rollerResponse.json();
        console.log('Roles data structure:', JSON.stringify(rollerData).substring(0, 500));
        
        // Check if rollegrupper exists
        if (rollerData.rollegrupper && Array.isArray(rollerData.rollegrupper)) {
          console.log('Number of rollegrupper:', rollerData.rollegrupper.length);
          
          // First try to find daglig leder
          const dagligLeder = rollerData.rollegrupper.find((rg: any) => 
            rg.type?.kode === 'DAGL'
          );
          
          if (dagligLeder && dagligLeder.roller && dagligLeder.roller.length > 0) {
            console.log('Found daglig leder gruppe');
            const person = dagligLeder.roller[0].person?.navn;
            if (person && person.fornavn && person.etternavn) {
              kontaktperson = `${person.fornavn} ${person.etternavn}`;
              kontaktpersonRolle = 'Daglig leder';
              console.log('Set kontaktperson from daglig leder:', kontaktperson);
            }
          }
          
          // If no daglig leder, try to find styreformann
          if (!kontaktperson) {
            console.log('No daglig leder, looking for styreformann');
            const styreGruppe = rollerData.rollegrupper.find((rg: any) => 
              rg.type?.kode === 'STYR'
            );
            
            if (styreGruppe && styreGruppe.roller && styreGruppe.roller.length > 0) {
              console.log('Found styre gruppe');
              // Look for styrets leder
              const styreformann = styreGruppe.roller.find((r: any) => 
                r.type?.beskrivelse?.toLowerCase().includes('leder')
              );
              
              if (styreformann && styreformann.person?.navn) {
                const person = styreformann.person.navn;
                if (person.fornavn && person.etternavn) {
                  kontaktperson = `${person.fornavn} ${person.etternavn}`;
                  kontaktpersonRolle = 'Styrets leder';
                  console.log('Set kontaktperson from styreformann:', kontaktperson);
                }
              }
            }
          }
        } else {
          console.log('No rollegrupper found in response');
        }
      } else {
        console.log('Roller API returned non-OK status:', rollerResponse.status);
      }
    } catch (rollerError) {
      console.error('Error fetching roles:', rollerError);
      console.error('Error details:', rollerError instanceof Error ? rollerError.message : String(rollerError));
    }
    
    console.log('Final kontaktperson value:', kontaktperson);

    // Try to fetch phone number from 1881.no
    let kontaktpersonTelefon = '';
    let telefonnummerKilde = '';
    let telefonnummerAlternativer: Array<{ telefon: string; adresse: string }> = [];
    
    if (kontaktperson && data.forretningsadresse) {
      console.log('Attempting to fetch phone number from 1881.no for:', kontaktperson);
      try {
        // Split name into parts
        const nameParts = kontaktperson.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        if (firstName && lastName) {
          // Include location in search for better accuracy
          const poststed = data.forretningsadresse.poststed || '';
          const searchQuery = encodeURIComponent(`${firstName} ${lastName} ${poststed}`);
          const searchUrl = `https://www.1881.no/?query=${searchQuery}`;
          
          console.log('Fetching from 1881.no:', searchUrl);
          
          const response1881 = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          
          if (response1881.ok) {
            const html = await response1881.text();
            console.log('1881.no response received, parsing HTML...');
            
            // Parse all phone numbers and their associated locations
            const listingPattern = /<div class="listing-contact">[\s\S]*?href="tel:(\+?\d+)"[\s\S]*?<span class="button-call__number">([\d\s]+)<\/span>[\s\S]*?<p class="listing-address">[\s\S]*?<span>([\s\S]*?)<\/span>/g;
            
            let match;
            const candidates = [];
            
            while ((match = listingPattern.exec(html)) !== null) {
              const telNumber = match[1];
              const displayNumber = match[2];
              const address = match[3].trim();
              
              candidates.push({
                tel: telNumber,
                display: displayNumber,
                address: address
              });
            }
            
            console.log(`Found ${candidates.length} candidates from 1881.no`);
            
            if (candidates.length > 0) {
              // Try to match by location
              const companyPoststed = poststed.toLowerCase();
              let bestMatch = null;
              
              for (const candidate of candidates) {
                const candidateLocation = candidate.address.toLowerCase();
                
                // Check if location matches
                if (candidateLocation.includes(companyPoststed)) {
                  bestMatch = candidate;
                  console.log('Found location match:', candidateLocation);
                  break;
                }
              }
              
              // If no location match, take first result but also save alternatives
              if (!bestMatch && candidates.length > 0) {
                bestMatch = candidates[0];
                console.log('No location match, using first result');
              }
              
              if (bestMatch) {
                // Clean up the phone number
                let phone = bestMatch.tel;
                phone = phone.replace(/^\+47/, '')
                            .replace(/^0047/, '')
                            .replace(/^47/, '')
                            .replace(/\s/g, '');
                
                if (/^\d{8}$/.test(phone)) {
                  kontaktpersonTelefon = phone;
                  telefonnummerKilde = '1881.no';
                  console.log('Selected phone number:', kontaktpersonTelefon);
                  
                  // Save alternatives if there are multiple results
                  if (candidates.length > 1) {
                    telefonnummerAlternativer = candidates.slice(0, 3).map(c => ({
                      telefon: c.tel.replace(/^\+47/, '').replace(/^0047/, '').replace(/^47/, '').replace(/\s/g, ''),
                      adresse: c.address
                    }));
                    console.log(`Saved ${telefonnummerAlternativer.length} alternatives`);
                  }
                } else {
                  console.log('Invalid phone format after cleaning:', phone);
                }
              }
            }
            
            if (!kontaktpersonTelefon) {
              console.log('No phone number found in 1881.no HTML');
            }
          } else {
            console.log('1881.no request failed with status:', response1881.status);
          }
        }
      } catch (error1881) {
        console.error('Error fetching from 1881.no:', error1881);
        console.error('Error details:', error1881 instanceof Error ? error1881.message : String(error1881));
        // Don't fail the whole request if 1881 fails
      }
    }

    // Extract relevant information
    const result = {
      navn: data.navn || '',
      organisasjonsnummer: data.organisasjonsnummer || '',
      forretningsadresse: data.forretningsadresse ? {
        adresse: data.forretningsadresse.adresse?.join(', ') || '',
        postnummer: data.forretningsadresse.postnummer || '',
        poststed: data.forretningsadresse.poststed || '',
      } : null,
      naeringskode1: data.naeringskode1 ? {
        kode: data.naeringskode1.kode || '',
        beskrivelse: data.naeringskode1.beskrivelse || '',
      } : null,
      hjemmeside: data.hjemmeside || '',
      kontaktperson: kontaktperson,
      kontaktpersonRolle: kontaktpersonRolle,
      kontaktpersonTelefon: kontaktpersonTelefon,
      telefonnummerKilde: telefonnummerKilde,
      telefonnummerAlternativer: telefonnummerAlternativer,
      stiftelsesdato: data.stiftelsesdato || null,
      slettedato: data.slettedato || null,
      konkurs: data.konkurs || false,
      underAvvikling: data.underAvvikling || false,
      underTvangsavviklingEllerTvangsopplosning: data.underTvangsavviklingEllerTvangsopplosning || false,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in brreg-enhanced-lookup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
