import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, FileJson } from "lucide-react";
import { EvaluationExportService } from "@/modules/core/supplier";
import { toast } from "sonner";
import { buildClientContext } from "@/shared/lib/buildContext";

interface SupplierEvaluationExportProps {
  projectId: string;
  supplierId: string;
  supplierName: string;
}

export function SupplierEvaluationExport({
  projectId,
  supplierId,
  supplierName
}: SupplierEvaluationExportProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportMarkdown = async () => {
    setExporting(true);
    try {
      const ctx = await buildClientContext();
      const markdown = await EvaluationExportService.exportAsMarkdown(ctx, projectId, supplierId);
      
      // Download as file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluering-${supplierName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Rapport eksportert som Markdown");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Kunne ikke eksportere rapport");
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const ctx = await buildClientContext();
      const json = await EvaluationExportService.exportAsJSON(ctx, projectId, supplierId);
      
      // Download as file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluering-${supplierName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Rapport eksportert som JSON");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Kunne ikke eksportere rapport");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportMarkdown}
        disabled={exporting}
      >
        <FileText className="mr-2 h-4 w-4" />
        Eksporter Markdown
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportJSON}
        disabled={exporting}
      >
        <FileJson className="mr-2 h-4 w-4" />
        Eksporter JSON
      </Button>
    </div>
  );
}
