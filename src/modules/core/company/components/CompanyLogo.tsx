import { useState, useEffect } from 'react';
import { Building } from 'lucide-react';
import { fetchCompanyLogo } from '@/utils/logoFetcher';
import { supabase } from '@/integrations/supabase/client';

interface CompanyLogoProps {
  websiteUrl?: string;
  companyName: string;
  className?: string;
  companyId?: string;
  existingLogoUrl?: string | null;
}

const CompanyLogo = ({ websiteUrl, companyName, className = '', companyId, existingLogoUrl }: CompanyLogoProps) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(existingLogoUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If we already have a logo URL, use it
    if (existingLogoUrl) {
      setLogoUrl(existingLogoUrl);
      return;
    }

    if (!websiteUrl) {
      setLogoUrl(null);
      return;
    }

    const loadLogo = async () => {
      setLoading(true);
      setError(false);
      try {
        const url = await fetchCompanyLogo(websiteUrl);
        if (url) {
          setLogoUrl(url);
          
          // Save logo URL to company_metadata if companyId is provided
          if (companyId) {
            const { error: updateError } = await supabase
              .from('company_metadata')
              .upsert({
                company_id: companyId,
                logo_url: url,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'company_id'
              });
            
            if (updateError) {
              console.error('Error saving logo URL:', updateError);
            }
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching logo:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadLogo();
  }, [websiteUrl, companyId, existingLogoUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <div className="animate-pulse">
          <Building className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !logoUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <Building className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-white rounded-lg border ${className}`}>
      <img
        src={logoUrl}
        alt={`${companyName} logo`}
        className="max-w-full max-h-full object-contain p-2"
        onError={() => setError(true)}
      />
    </div>
  );
};

export default CompanyLogo;
