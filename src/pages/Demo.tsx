import { useState } from 'react';
import { useTenant } from '@/shared/tenant/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';
import { MessageSquare } from 'lucide-react';

export default function Demo() {
  const tenant = useTenant();
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleGenerate = async () => {
    // Mock response for now
    setResponse({
      sections: [
        {
          type: 'hero',
          title: `Velkommen til ${tenant.name}`,
          description: 'Vi hjelper bedrifter med digital transformasjon'
        },
        {
          type: 'cards',
          title: 'Våre tjenester',
          items: [
            { title: 'Rådgivning', description: 'Strategisk veiledning' },
            { title: 'Implementering', description: 'Teknisk gjennomføring' },
            { title: 'Support', description: 'Kontinuerlig oppfølging' }
          ]
        }
      ]
    });
  };

  const hexToHSL = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const themeStyle = {
    '--color-primary': hexToHSL(tenant.theme.primary),
    '--color-accent': hexToHSL(tenant.theme.accent),
    '--color-surface': hexToHSL(tenant.theme.surface),
    '--color-text-on-surface': hexToHSL(tenant.theme.text),
    fontFamily: tenant.theme.fontStack || 'inherit'
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background" style={themeStyle}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            {tenant.theme.logoUrl && (
              <img src={tenant.theme.logoUrl} alt={tenant.name} className="h-8" />
            )}
          </div>
          <nav className="flex gap-6">
            {tenant.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
                style={{ color: `hsl(var(--color-text-on-surface))` }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b py-12" style={{ backgroundColor: `hsl(var(--color-surface))` }}>
        <div className="container">
          <h1 className="text-4xl font-bold mb-4" style={{ color: `hsl(var(--color-primary))` }}>
            {tenant.name}
          </h1>
          <p className="text-lg" style={{ color: `hsl(var(--color-text-on-surface))` }}>
            Intelligent assistent for {tenant.name.toLowerCase()}
          </p>
        </div>
      </section>

      {/* Generator Card */}
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Generer svarside</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Skriv inn spørsmål eller tema..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
            />
            <Button 
              onClick={handleGenerate}
              style={{ 
                backgroundColor: `hsl(var(--color-primary))`,
                color: 'white'
              }}
            >
              Generer svarside
            </Button>
          </CardContent>
        </Card>

        {/* Response Display */}
        {response && (
          <div className="mt-8 space-y-6">
            {response.sections.map((section: any, idx: number) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {section.type === 'hero' && <p>{section.description}</p>}
                  {section.type === 'cards' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {section.items.map((item: any, i: number) => (
                        <Card key={i}>
                          <CardHeader>
                            <CardTitle className="text-base">{item.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Chat Dock */}
      <div className="fixed bottom-4 right-4 z-50">
        {showChat ? (
          <div className="w-[400px] h-[600px]">
            <AIMcpChatInterface
              tenantId={tenant.id}
              title={`${tenant.name} Assistent`}
              description="Spør meg om noe..."
              placeholder="Skriv din melding..."
            />
          </div>
        ) : (
          <Button
            size="lg"
            onClick={() => setShowChat(true)}
            style={{ 
              backgroundColor: `hsl(var(--color-primary))`,
              color: 'white'
            }}
            className="rounded-full h-14 w-14 p-0"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
