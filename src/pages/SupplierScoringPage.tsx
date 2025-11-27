import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SupplierAIScoring } from "@/components/Supplier/SupplierAIScoring";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function SupplierScoringPage() {
  const { projectId, supplierId } = useParams();
  const navigate = useNavigate();
  const [supplierName, setSupplierName] = useState('');

  useEffect(() => {
    const fetchSupplier = async () => {
      const { data } = await supabase
        .from('companies')
        .select('name')
        .eq('id', supplierId)
        .single();
      
      if (data) setSupplierName(data.name);
    };
    
    if (supplierId) fetchSupplier();
  }, [supplierId]);

  return (
    <div className="container mx-auto py-8">
      <AppBreadcrumbs levels={generateBusinessBreadcrumbs({
        currentPage: "Supplier Scoring"
      })} />
      <h1 className="text-3xl font-bold mb-6">Leverandørvurdering</h1>
      <div className="container py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake
        </Button>

        {projectId && supplierId && (
          <SupplierAIScoring
            projectId={projectId}
            supplierId={supplierId}
            supplierName={supplierName}
          />
        )}
      </div>
    </div>
  );
}
