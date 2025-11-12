import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";

interface ValidationResult {
  table_name: string;
  issue: string;
  suggestion: string;
  severity: 'ERROR' | 'WARN' | 'INFO';
}

export default function DatabaseNamingValidation() {
  const { data: validation, isLoading } = useQuery({
    queryKey: ['table-naming-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_naming_validation')
        .select('*')
        .order('severity', { ascending: false });
      
      if (error) throw error;
      return data as ValidationResult[];
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'INFO':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      ERROR: 'destructive',
      WARN: 'default',
      INFO: 'secondary',
    };
    
    return (
      <Badge variant={variants[severity] || 'outline'}>
        {severity}
      </Badge>
    );
  };

  const errorCount = validation?.filter(v => v.severity === 'ERROR').length || 0;
  const warnCount = validation?.filter(v => v.severity === 'WARN').length || 0;
  const okCount = validation?.filter(v => v.issue === 'OK').length || 0;

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading validation results...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Naming Validation</h1>
        <p className="text-muted-foreground mt-2">
          Automated checks for table naming convention compliance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorCount}</div>
            <p className="text-xs text-muted-foreground">
              Critical issues requiring immediate fix
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warnCount}</div>
            <p className="text-xs text-muted-foreground">
              Issues to review and address
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OK</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{okCount}</div>
            <p className="text-xs text-muted-foreground">
              Tables following conventions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert for Critical Issues */}
      {errorCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Issues Found</AlertTitle>
          <AlertDescription>
            {errorCount} table{errorCount > 1 ? 's have' : ' has'} critical naming or configuration issues. 
            These should be fixed immediately to ensure proper tenant isolation and security.
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Results</CardTitle>
          <CardDescription>
            Detailed breakdown of all database tables and their compliance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[200px]">Table Name</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Suggestion</TableHead>
                <TableHead className="w-[100px]">Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validation?.map((row) => (
                <TableRow key={row.table_name}>
                  <TableCell>
                    {getSeverityIcon(row.severity)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {row.table_name}
                  </TableCell>
                  <TableCell>
                    {row.issue === 'OK' ? (
                      <span className="text-success">Compliant</span>
                    ) : (
                      <span className="text-foreground">{row.issue}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.suggestion}
                  </TableCell>
                  <TableCell>
                    {getSeverityBadge(row.severity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Learn More</AlertTitle>
        <AlertDescription>
          See{' '}
          <Link 
            to="/admin/documentation/database-naming" 
            className="underline font-medium hover:text-primary"
          >
            Database Naming Conventions
          </Link>
          {' '}for detailed guidelines and examples.
        </AlertDescription>
      </Alert>
    </div>
  );
}
