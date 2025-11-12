# Automatisk Dokumentasjonskatalog

## Oversikt

Systemet oppdager automatisk alle `.md` filer i `public/docs/` og genererer `src/config/documentationCatalog.ts` med metadata.

## Hvordan det virker

### 1. Scanning av filer
- Scriptet `scripts/generate-docs-catalog.js` scanner rekursivt `public/docs/`
- Finner alle `.md` filer uavhengig av undermapper

### 2. Metadata-parsing
For hver `.md` fil:
- **Tittel**: Hentes fra første `# Heading` i filen
- **Beskrivelse**: Første paragraf etter heading (maks 150 tegn)
- **Kategori**: Automatisk basert på filnavn (Architecture, Platform, Development, Implementation)
- **Tags**: Genereres fra filnavn (maks 4 tags)
- **ID**: Normalisert fra filnavn (lowercase, kebab-case)

### 3. Kategorisering

Kategorier tildeles basert på nøkkelord i filnavnet:

| Nøkkelord | Kategori |
|-----------|----------|
| database, tenant, architecture, naming | Architecture |
| app, platform, operation, admin, permission, role | Platform |
| test, development | Development |
| implementation, sprint, summary | Implementation |

Standard kategori: `Platform`

### 4. Build-integrasjon

Katalogen regenereres automatisk:
- **Ved hver build**: `npm run build`
- **Ved dev start**: `npm run dev`
- **Manuelt**: `npm run generate:docs`

## Legge til ny dokumentasjon

1. **Legg fil i** `public/docs/`
   ```
   public/docs/my-new-doc.md
   ```

2. **Strukturer markdown med heading**:
   ```markdown
   # My New Documentation
   
   This is a short description of what this document contains.
   
   ## Content...
   ```

3. **Kjør generator** (automatisk ved neste build):
   ```bash
   npm run generate:docs
   ```

Filen vil automatisk:
- Få ID: `my-new-doc`
- Tittel: "My New Documentation"
- Beskrivelse: "This is a short description..."
- Tags: `['my', 'new', 'doc']`
- Kategori: Basert på filnavn

## Frontmatter (fremtidig feature)

For mer kontroll over metadata kan vi legge til YAML frontmatter:

```markdown
---
title: Custom Title
description: Custom description
category: Architecture
tags: [custom, tags, here]
---

# Document content...
```

## Mappestruktur

```
public/docs/
├── admin-permissions-mapping.md
├── apps.md
├── database-naming-conventions.md
├── IMPLEMENTATION_SUMMARY.md
├── operations.md
├── README.md
├── README.test.md
├── SPRINT_STATUS.md
└── tenants.md
```

## Feilsøking

**Katalogen oppdateres ikke:**
```bash
npm run generate:docs
```

**Dokumenter vises ikke i UI:**
- Sjekk at filen ligger i `public/docs/`
- Verifiser at `src/config/documentationCatalog.ts` ble regenerert
- Se etter feil i build-loggen

**Feil kategori/tags:**
- Oppdater `CATEGORY_MAP` i `scripts/generate-docs-catalog.js`
- Kjør `npm run generate:docs` igjen
