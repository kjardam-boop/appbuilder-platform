import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAllEvaluationSummaries, SUPPLIER_EVALUATION_CATEGORIES } from "@/modules/core/supplier";

interface SupplierComparisonMatrixProps {
  projectId: string;
}

export const SupplierComparisonMatrix = ({ projectId }: SupplierComparisonMatrixProps) => {
  const { data: summaries, isLoading } = useAllEvaluationSummaries(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leverandørsammenligning</CardTitle>
        <CardDescription>
          Sammenlign leverandører på tvers av evalueringskategorier
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summaries?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Ingen evalueringer funnet for dette prosjektet
          </p>
        ) : (
          <>
            {/* Desktop view */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    {summaries?.map((summary) => (
                      <TableHead key={summary.supplier_id} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span>{summary.supplier_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {summary.overallScore.toFixed(1)}/5
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SUPPLIER_EVALUATION_CATEGORIES.map((category) => (
                    <TableRow key={category.key}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{category.label}</div>
                          <div className="text-xs text-muted-foreground">{category.description}</div>
                        </div>
                      </TableCell>
                      {summaries?.map((summary) => {
                        const catData = summary.categories[category.key];
                        return (
                          <TableCell key={summary.supplier_id} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              {catData ? (
                                <>
                                  <Badge variant="outline">
                                    {catData.score.toFixed(1)}/5
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {catData.completedQuestions}/{catData.totalQuestions}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell>Totalt snitt</TableCell>
                    {summaries?.map((summary) => (
                      <TableCell key={summary.supplier_id} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="default">
                            {summary.overallScore.toFixed(1)}/5
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {summary.totalCompleted}/{summary.totalQuestions}
                          </span>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile/Tablet view */}
            <div className="lg:hidden space-y-4">
              {summaries?.map((summary) => (
                <Card key={summary.supplier_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{summary.supplier_name}</CardTitle>
                      <Badge variant="default" className="text-base">
                        {summary.overallScore.toFixed(1)}/5
                      </Badge>
                    </div>
                    <CardDescription>
                      {summary.totalCompleted} av {summary.totalQuestions} spørsmål besvart
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SUPPLIER_EVALUATION_CATEGORIES.map((category) => {
                      const catData = summary.categories[category.key];
                      if (!catData) return null;

                      return (
                        <div key={category.key} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{category.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {catData.completedQuestions}/{catData.totalQuestions} besvart
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {catData.score.toFixed(1)}/5
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
