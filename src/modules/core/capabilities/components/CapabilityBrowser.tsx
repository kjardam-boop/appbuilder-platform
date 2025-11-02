/**
 * Capability Browser Component
 * Browse and filter capability catalog
 */

import { useState } from "react";
import { useCapabilities } from "../hooks/useCapabilities";
import { CapabilityCard } from "./CapabilityCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Capability, CapabilityCategory } from "../types/capability.types";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES: CapabilityCategory[] = [
  "AI",
  "Integration",
  "UI Component",
  "Business Logic",
  "Authentication",
  "Data Management",
];

interface CapabilityBrowserProps {
  onSelect?: (capability: Capability) => void;
  selectedIds?: string[];
  showPrice?: boolean;
}

export function CapabilityBrowser({
  onSelect,
  selectedIds = [],
  showPrice = true,
}: CapabilityBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<CapabilityCategory | "all">("all");

  const { data: capabilities, isLoading } = useCapabilities({
    query: searchQuery || undefined,
    category: category !== "all" ? category : undefined,
    isActive: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter funksjoner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as any)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kategorier</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {capabilities && capabilities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((capability) => (
            <CapabilityCard
              key={capability.id}
              capability={capability}
              onSelect={onSelect}
              isSelected={selectedIds.includes(capability.id)}
              showPrice={showPrice}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Ingen funksjoner funnet</p>
          <p className="text-sm mt-1">Prøv å justere søkekriteriene</p>
        </div>
      )}
    </div>
  );
}
