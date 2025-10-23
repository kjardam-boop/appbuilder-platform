import { useState, useEffect } from 'react';
import { Building } from 'lucide-react';
import { fetchCompanyLogo } from '@/utils/logoFetcher';

interface CompanyLogoProps {
  websiteUrl?: string;
  companyName: string;
  className?: string;
  onLogoFetched?: (logoUrl: string) => void;
}

const CompanyLogo = ({ websiteUrl, companyName, className = '', onLogoFetched }: CompanyLogoProps) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
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
          onLogoFetched?.(url);
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
  }, [websiteUrl, onLogoFetched]);

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
