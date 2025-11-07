import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TenantDetails from '../../../TenantDetails';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/usePlatformAdmin', () => ({
  usePlatformAdmin: () => ({ isPlatformAdmin: true, isLoading: false }),
}));
vi.mock('@/renderer/tools/toolExecutor', () => ({
  executeTool: vi.fn(),
}));

const mockTenant = {
  id: 't-1',
  name: 'APPLICA AS',
  slug: 'applica-as',
  domain: 'www.applica.no',
  status: 'active',
  plan: 'free',
  created_at: '2025-11-07T00:00:00Z',
  settings: { company_id: 'c-1' },
};

const mockCompany = {
  id: 'c-1',
  name: 'APPLICA AS',
  org_number: '985418357',
  website: 'www.applica.no',
};

describe('TenantDetails page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock tenant, company, projects, users, and applications queries
    (supabase.from as any) = vi.fn((table: string) => {
      const builder: any = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.in = vi.fn().mockReturnValue(builder);
      builder.order = vi.fn().mockReturnValue(builder);
      
      if (table === 'tenants') {
        builder.single = vi.fn().mockResolvedValue({ data: mockTenant, error: null });
      } else if (table === 'companies') {
        builder.single = vi.fn().mockResolvedValue({ data: mockCompany, error: null });
      } else if (table === 'customer_app_projects') {
        builder.order = vi.fn().mockResolvedValue({ data: [], error: null });
      } else if (table === 'user_roles') {
        builder.eq = vi.fn().mockReturnThis();
        return { ...builder, then: vi.fn().mockResolvedValue({ data: [], error: null }) };
      } else if (table === 'applications') {
        return { ...builder, then: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }
      
      return builder;
    });
  });

  it('renders tenant details with name and status', async () => {
    render(
      <BrowserRouter>
        <TenantDetails />
      </BrowserRouter>
    );

    expect(await screen.findByText('APPLICA AS')).toBeInTheDocument();
    expect(await screen.findByText('active')).toBeInTheDocument();
    expect(await screen.findByText('free')).toBeInTheDocument();
  });

  it('renders breadcrumbs correctly', async () => {
    render(
      <BrowserRouter>
        <TenantDetails />
      </BrowserRouter>
    );

    expect(await screen.findByText('Admin')).toBeInTheDocument();
    expect(await screen.findByText('Tenants')).toBeInTheDocument();
  });

  it('renders tabs for overview, applications, and users', async () => {
    render(
      <BrowserRouter>
        <TenantDetails />
      </BrowserRouter>
    );

    expect(await screen.findByText('Oversikt')).toBeInTheDocument();
    expect(await screen.findByText('Applikasjoner')).toBeInTheDocument();
    expect(await screen.findByText('Brukere')).toBeInTheDocument();
  });

  it('displays company information when linked', async () => {
    render(
      <BrowserRouter>
        <TenantDetails />
      </BrowserRouter>
    );

    expect(await screen.findByText('Tilknyttet selskap')).toBeInTheDocument();
    expect(await screen.findByText('985418357')).toBeInTheDocument();
  });

  it('renders error state when tenant not found', async () => {
    (supabase.from as any) = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }));

    render(
      <BrowserRouter>
        <TenantDetails />
      </BrowserRouter>
    );

    expect(await screen.findByText('Tenant ikke funnet')).toBeInTheDocument();
  });
});
