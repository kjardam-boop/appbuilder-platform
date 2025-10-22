import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  Package, 
  Zap, 
  Shield, 
  GitBranch,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const features = [
    {
      icon: Building2,
      title: "Multi-Tenant Architecture",
      description: "Isolated customer environments with shared infrastructure for efficiency and scalability",
    },
    {
      icon: Package,
      title: "Modular System",
      description: "Mix and match core modules with custom addons to fit each customer's unique needs",
    },
    {
      icon: Zap,
      title: "Rapid Deployment",
      description: "Standardized processes enable quick application development and delivery",
    },
    {
      icon: Shield,
      title: "Data Ownership",
      description: "Customers maintain full control of their data with option for self-hosting",
    },
    {
      icon: GitBranch,
      title: "Flexible Integrations",
      description: "Connect seamlessly with ERP, CRM, logistics, and e-commerce systems",
    },
    {
      icon: CheckCircle2,
      title: "Low Lock-In",
      description: "Standard codebase enables easy transition to customer-owned deployment",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15
          }}
        />
        <div className="absolute inset-0 bg-gradient-hero z-0" />
        
        <div className="container relative z-10 py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Build Custom Apps for Your Customers,
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Faster</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              An internal platform for developing, delivering, and operating tailored business applications. 
              Standardize your process, accelerate delivery, and maintain full flexibility.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="lg" asChild>
                <Link to="/dashboard">
                  View Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/modules">
                  Browse Modules
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Platform Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build and deliver customer-specific applications
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="shadow-card hover:shadow-elevated transition-all">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-muted/50 py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Built For Real Business Needs</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From ERP integrations to CRM analytics - standardized modules for common use cases
            </p>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>ERP Integration Hub</CardTitle>
                <CardDescription>
                  Connect projects, documents, and workflows across systems like Visma and Xledger
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Bidirectional data sync
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Custom field mapping
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Real-time updates
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>CRM Analytics</CardTitle>
                <CardDescription>
                  Scoring, decision matrices, and reporting for sales and customer data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Lead scoring engine
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Decision frameworks
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    HubSpot integration
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Document Workflows</CardTitle>
                <CardDescription>
                  Manage proposals, contracts, and project documentation with version control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Template library
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Approval workflows
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    E-signature support
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Build Your Next Customer App?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Get started with the platform and deliver tailored solutions faster than ever
          </p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/dashboard">
              Access Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
