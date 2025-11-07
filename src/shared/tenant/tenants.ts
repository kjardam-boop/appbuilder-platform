export type TenantConfig = {
  id: string;
  name: string;
  baseUrl: string;
  nav: { label: string; href: string }[];
  theme: { 
    primary: string; 
    accent: string; 
    surface: string; 
    text: string; 
    logoUrl: string; 
    fontStack?: string 
  };
};

export const tenants: Record<string, TenantConfig> = {
  akselera: {
    id: "akselera",
    name: "Akselera",
    baseUrl: "https://www.akselera.com",
    nav: [
      { label: "Hjem", href: "https://www.akselera.com" },
      { label: "Tjenester", href: "https://www.akselera.com/services" },
      { label: "Om", href: "https://www.akselera.com/about" }
    ],
    theme: {
      primary: "#003E6B",
      accent: "#00A859",
      surface: "#FFFFFF",
      text: "#1A1A1A",
      logoUrl: "https://www.akselera.com/wp-content/uploads/2021/02/Akselera-Logo.svg",
      fontStack: "'Open Sans', Arial, sans-serif"
    }
  }
};
