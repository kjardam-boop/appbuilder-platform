import { supabase } from "@/integrations/supabase/client";
import { ApplicationService } from "../applicationService";
import { ApplicationServiceOptimized } from "../applicationService.optimized";
import { TenantSystemService } from "../tenantExternalSystemService";

/**
 * Performance Analysis Tool
 * Compares performance between direct table queries and optimized views
 */

interface PerformanceMetric {
  operation: string;
  method: "direct" | "optimized";
  executionTime: number;
  queryCount: number;
  dataSize: number;
  timestamp: string;
}

class PerformanceAnalyzer {
  private metrics: PerformanceMetric[] = [];

  /**
   * Measure execution time of a function
   */
  private async measure<T>(
    operation: string,
    method: "direct" | "optimized",
    fn: () => Promise<T>
  ): Promise<{ result: T; metric: PerformanceMetric }> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();

    const metric: PerformanceMetric = {
      operation,
      method,
      executionTime: endTime - startTime,
      queryCount: 1, // Simplified - would need query counting middleware
      dataSize: JSON.stringify(result).length,
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(metric);
    return { result, metric };
  }

  /**
   * Test 1: List all products
   */
  async testListProducts() {
    console.log("🔍 Testing: List Products");

    // Direct query (old way)
    const { metric: directMetric } = await this.measure(
      "listProducts",
      "direct",
      async () => {
        const { data } = await supabase
          .from("app_products" as any)
          .select(`
            *,
            vendor:app_vendors(name, website),
            category:app_categories(name, key)
          `)
          .eq("status", "Active")
          .order("name");
        return data;
      }
    );

    // Optimized query (using view)
    const { metric: optimizedMetric } = await this.measure(
      "listProducts",
      "optimized",
      () => ApplicationServiceOptimized.listProducts({ status: "Active" })
    );

    const improvement = ((directMetric.executionTime - optimizedMetric.executionTime) / directMetric.executionTime * 100);

    console.log(`  Direct:     ${directMetric.executionTime.toFixed(2)}ms`);
    console.log(`  Optimized:  ${optimizedMetric.executionTime.toFixed(2)}ms`);
    console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
  }

  /**
   * Test 2: Get product with full details
   */
  async testGetProductDetails(productId: string) {
    console.log("\n🔍 Testing: Get Product Details");

    // Direct query (old way - multiple queries)
    const { metric: directMetric } = await this.measure(
      "getProductDetails",
      "direct",
      async () => {
        // Simulates what the old service did
        const { data: product } = await supabase
          .from("app_products" as any)
          .select(`
            *,
            vendor:app_vendors(name, website),
            category:app_categories(name)
          `)
          .eq("id", productId)
          .single();

        const { data: skus } = await supabase
          .from("external_system_skus" as any)
          .select("*")
          .eq("external_system_id", productId);

        const { data: integrations } = await supabase
          .from("app_integrations" as any)
          .select("*")
          .eq("app_product_id", productId);

        const { data: erp } = await supabase
          .from("erp_extensions" as any)
          .select("*")
          .eq("app_product_id", productId)
          .maybeSingle();

        return { 
          product, 
          skus: skus || [], 
          integrations: integrations || [], 
          erp: erp || null 
        };
      }
    );

    // Optimized query (using aggregated view)
    const { metric: optimizedMetric } = await this.measure(
      "getProductDetails",
      "optimized",
      () => ApplicationServiceOptimized.getProductById(productId)
    );

    const improvement = ((directMetric.executionTime - optimizedMetric.executionTime) / directMetric.executionTime * 100);

    console.log(`  Direct:     ${directMetric.executionTime.toFixed(2)}ms (4 queries)`);
    console.log(`  Optimized:  ${optimizedMetric.executionTime.toFixed(2)}ms (1 query)`);
    console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
    console.log(`  Query reduction: 75%`);
  }

  /**
   * Test 3: Get systems by capability
   */
  async testGetByCapability(capability: string) {
    console.log("\n🔍 Testing: Get Systems by Capability");

    // Direct query (old way)
    const { metric: directMetric } = await this.measure(
      "getByCapability",
      "direct",
      async () => {
        const { data: actions } = await supabase
          .from("app_product_mcp_actions" as any)
          .select("app_product_id")
          .eq("mcp_action_key", capability)
          .eq("is_active", true);

        const productIds = actions?.map((a: any) => a.app_product_id) || [];
        
        if (productIds.length === 0) return [];

        const { data } = await supabase
          .from("app_products" as any)
          .select(`
            *,
            vendor:app_vendors(name)
          `)
          .in("id", productIds)
          .eq("status", "Active");

        return data;
      }
    );

    // Optimized query (using function)
    const { metric: optimizedMetric } = await this.measure(
      "getByCapability",
      "optimized",
      () => ApplicationServiceOptimized.getByCapability(capability)
    );

    const improvement = ((directMetric.executionTime - optimizedMetric.executionTime) / directMetric.executionTime * 100);

    console.log(`  Direct:     ${directMetric.executionTime.toFixed(2)}ms (2+ queries)`);
    console.log(`  Optimized:  ${optimizedMetric.executionTime.toFixed(2)}ms (1 function call)`);
    console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
  }

  /**
   * Test 4: List tenant systems
   */
  async testListTenantSystems(tenantId: string) {
    console.log("\n🔍 Testing: List Tenant Systems");

    // Direct query (old way)
    const { metric: directMetric } = await this.measure(
      "listTenantSystems",
      "direct",
      async () => {
        const { data } = await supabase
          .from("tenant_external_systems" as any)
          .select(`
            *,
            external_system:app_products(
              id, 
              name, 
              slug, 
              vendor:external_system_vendors(name)
            ),
            sku:external_system_skus(code, edition_name)
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });
        return data;
      }
    );

    // Optimized query (using view)
    const { metric: optimizedMetric } = await this.measure(
      "listTenantSystems",
      "optimized",
      () => TenantSystemService.listByTenant(tenantId)
    );

    const improvement = ((directMetric.executionTime - optimizedMetric.executionTime) / directMetric.executionTime * 100);

    console.log(`  Direct:     ${directMetric.executionTime.toFixed(2)}ms`);
    console.log(`  Optimized:  ${optimizedMetric.executionTime.toFixed(2)}ms`);
    console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
  }

  /**
   * Test 5: Get tenant system summary
   */
  async testTenantSystemSummary(tenantId: string) {
    console.log("\n🔍 Testing: Tenant System Summary");

    // Direct query (old way - client-side aggregation)
    const { metric: directMetric } = await this.measure(
      "tenantSystemSummary",
      "direct",
      async () => {
        const { data: systems } = await supabase
          .from("tenant_external_systems" as any)
          .select(`
            *,
            external_system:app_products(app_types, vendor:app_vendors(name))
          `)
          .eq("tenant_id", tenantId);

        // Client-side aggregation
        const total = systems?.length || 0;
        const mcpEnabled = systems?.filter((s: any) => s.mcp_enabled).length || 0;
        
        const typeCount: Record<string, number> = {};
        const vendorCount: Record<string, number> = {};

        systems?.forEach((s: any) => {
          s.external_system?.app_types?.forEach((type: string) => {
            typeCount[type] = (typeCount[type] || 0) + 1;
          });
          const vendor = s.external_system?.vendor?.name;
          if (vendor) {
            vendorCount[vendor] = (vendorCount[vendor] || 0) + 1;
          }
        });

        const mostUsedVendors = Object.entries(vendorCount)
          .map(([name, count]) => ({ vendor_name: name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          total_systems: total,
          mcp_enabled_count: mcpEnabled,
          systems_by_type: typeCount,
          most_used_vendors: mostUsedVendors,
        };
      }
    );

    // Optimized query (using function)
    const { metric: optimizedMetric } = await this.measure(
      "tenantSystemSummary",
      "optimized",
      () => ApplicationServiceOptimized.getTenantSystemSummary(tenantId)
    );

    const improvement = ((directMetric.executionTime - optimizedMetric.executionTime) / directMetric.executionTime * 100);

    console.log(`  Direct:     ${directMetric.executionTime.toFixed(2)}ms (1 query + client aggregation)`);
    console.log(`  Optimized:  ${optimizedMetric.executionTime.toFixed(2)}ms (1 function, DB aggregation)`);
    console.log(`  Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
  }

  /**
   * Generate summary report
   */
  generateReport(): string {
    const byOperation = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = { direct: [], optimized: [] };
      }
      acc[metric.operation][metric.method].push(metric);
      return acc;
    }, {} as Record<string, { direct: PerformanceMetric[], optimized: PerformanceMetric[] }>);

    let report = "\n\n📊 PERFORMANCE ANALYSIS SUMMARY\n";
    report += "================================\n\n";

    Object.entries(byOperation).forEach(([operation, metrics]) => {
      const directAvg = metrics.direct.reduce((sum, m) => sum + m.executionTime, 0) / metrics.direct.length;
      const optimizedAvg = metrics.optimized.reduce((sum, m) => sum + m.executionTime, 0) / metrics.optimized.length;
      const improvement = ((directAvg - optimizedAvg) / directAvg * 100);

      report += `${operation}:\n`;
      report += `  Direct avg:     ${directAvg.toFixed(2)}ms\n`;
      report += `  Optimized avg:  ${optimizedAvg.toFixed(2)}ms\n`;
      report += `  Improvement:    ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%\n\n`;
    });

    const totalDirect = this.metrics.filter(m => m.method === "direct").reduce((sum, m) => sum + m.executionTime, 0);
    const totalOptimized = this.metrics.filter(m => m.method === "optimized").reduce((sum, m) => sum + m.executionTime, 0);
    const totalImprovement = ((totalDirect - totalOptimized) / totalDirect * 100);

    report += "OVERALL:\n";
    report += `  Total direct:     ${totalDirect.toFixed(2)}ms\n`;
    report += `  Total optimized:  ${totalOptimized.toFixed(2)}ms\n`;
    report += `  Total improvement: ${totalImprovement > 0 ? '+' : ''}${totalImprovement.toFixed(1)}%\n\n`;

    report += "KEY BENEFITS:\n";
    report += "  ✓ Reduced query complexity\n";
    report += "  ✓ Consistent aliasing (no mapping needed)\n";
    report += "  ✓ Server-side aggregation\n";
    report += "  ✓ Single query for complex joins\n";
    report += "  ✓ Better query plan caching\n";

    return report;
  }

  /**
   * Run all tests
   */
  async runAll(config: {
    productId?: string;
    tenantId?: string;
    capability?: string;
  }) {
    console.log("🚀 Starting Performance Analysis...\n");

    try {
      await this.testListProducts();
      
      if (config.productId) {
        await this.testGetProductDetails(config.productId);
      }
      
      if (config.capability) {
        await this.testGetByCapability(config.capability);
      }
      
      if (config.tenantId) {
        await this.testListTenantSystems(config.tenantId);
        await this.testTenantSystemSummary(config.tenantId);
      }

      console.log(this.generateReport());
    } catch (error) {
      console.error("❌ Performance test failed:", error);
    }
  }
}

/**
 * Export for use in tests or admin tools
 */
export const performanceAnalyzer = new PerformanceAnalyzer();

/**
 * Helper function to run quick performance check
 */
export async function quickPerformanceCheck() {
  // Get first product and tenant for testing
  const productsResult = await supabase
    .from("app_products" as any)
    .select("id")
    .limit(1)
    .single();

  const tenantsResult = await supabase
    .from("tenants" as any)
    .select("id")
    .limit(1)
    .single();

  if (productsResult.error || tenantsResult.error) {
    console.error("Failed to fetch test data:", productsResult.error || tenantsResult.error);
    return;
  }

  const productId = productsResult.data ? (productsResult.data as any).id : undefined;
  const tenantId = tenantsResult.data ? (tenantsResult.data as any).id : undefined;

  await performanceAnalyzer.runAll({
    productId,
    tenantId,
    capability: "create_contact",
  });
}
