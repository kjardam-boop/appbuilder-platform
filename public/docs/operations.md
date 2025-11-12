# Drift og Operasjoner

## Backup

### Database Backup

Supabase håndterer automatisk backup:
- Daily backups (siste 7 dager)
- Point-in-time recovery
- Manuell export via Supabase Dashboard

### Manuell export

```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Restore
supabase db reset --db-url <connection-string> -f backup.sql
```

## Migreringer

### Opprette ny migrering

Bruk Lovable's migration tool i UI, eller via CLI:

```bash
# Generer ny migrasjon
supabase migration new add_my_table

# Skriv SQL i generated fil
# supabase/migrations/[timestamp]_add_my_table.sql
```

### Kjøre migreringer

```bash
# Lokal utvikling
supabase db reset

# Produksjon (via Lovable UI)
# Push endringer → deploy automatisk
```

## Domener

### Subdomain (gratis)

Automatisk: `<tenant>.lovable.app`

### Custom Domain (krever betalt plan)

1. Gå til Project > Settings > Domains
2. Legg til domene (eks: `app.customer.com`)
3. Konfigurer DNS:
   ```
   Type: A
   Name: app
   Value: 185.158.133.1
   ```
4. Vent på SSL-provisjonering (24-48t)

## Monitoring

- Supabase Dashboard: Database metrics
- Lovable Analytics: Usage metrics
- Browser DevTools: Frontend errors

## Scaling

- Database: Connection pooling enabled
- Edge Functions: Auto-scale
- Frontend: CDN-cached

## Sikkerhet

- RLS policies på alle tabeller
- Secrets i Supabase Vault
- HTTPS enforced
- Rate limiting på integrasjoner
