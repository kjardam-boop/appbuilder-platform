// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApplications } from "../../applications/hooks/useApplications";
import { APP_TYPES } from "../../applications/types/application.types";
import type { EvaluationTarget } from "../types/evaluationTarget.types";

interface EvaluationTargetFilterProps {
  projectId: string;
  value: EvaluationTarget;
  onChange: (target: EvaluationTarget) => void;
}

export function EvaluationTargetFilter({ projectId, value, onChange }: EvaluationTargetFilterProps) {
  const { products, skus, companyApps } = useApplications(projectId);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(value.app_product_id);

  const handleTypeChange = (appType: string) => {
    onChange({ app_type: appType as any });
    setSelectedProductId(undefined);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    onChange({ app_product_id: productId });
  };

  const handleSkuChange = (skuId: string) => {
    onChange({ ...value, sku_id: skuId });
  };

  const handleCompanyAppChange = (companyAppId: string) => {
    onChange({ company_app_id: companyAppId });
  };

  const filteredSkus = selectedProductId
    ? skus?.filter(sku => sku.app_product_id === selectedProductId)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evalueringsfokus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>App-type</Label>
          <Select value={value.app_type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Velg app-type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(APP_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Produkt</Label>
          <Select value={value.app_product_id} onValueChange={handleProductChange}>
            <SelectTrigger>
              <SelectValue placeholder="Velg produkt (valgfritt)" />
            </SelectTrigger>
            <SelectContent>
              {products?.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProductId && filteredSkus.length > 0 && (
          <div className="space-y-2">
            <Label>SKU/Variant</Label>
            <Select value={value.sku_id} onValueChange={handleSkuChange}>
              <SelectTrigger>
                <SelectValue placeholder="Velg SKU (valgfritt)" />
              </SelectTrigger>
              <SelectContent>
                {filteredSkus.map(sku => (
                  <SelectItem key={sku.id} value={sku.id}>
                    {sku.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Eksisterende installasjon</Label>
          <Select value={value.company_app_id} onValueChange={handleCompanyAppChange}>
            <SelectTrigger>
              <SelectValue placeholder="Velg installasjon (valgfritt)" />
            </SelectTrigger>
            <SelectContent>
              {companyApps?.map(app => (
                <SelectItem key={app.id} value={app.id}>
                  {app.app_product?.name} ({app.environment})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
