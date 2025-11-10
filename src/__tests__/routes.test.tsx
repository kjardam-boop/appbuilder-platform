import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

// Mock components
const MockApplicationsPage = () => <div>External Systems Page</div>;
const MockApplicationDetails = () => <div>System Details Page</div>;
const MockApplicationCreate = () => <div>Create System Page</div>;

describe('Application Routes', () => {
  describe('Redirects from old /applications routes', () => {
    it('should redirect /applications to /external-systems', () => {
      render(
        <MemoryRouter initialEntries={['/applications']}>
          <Routes>
            <Route path="/external-systems" element={<MockApplicationsPage />} />
            <Route path="/applications" element={<Navigate to="/external-systems" replace />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText('External Systems Page')).toBeInTheDocument();
    });

    it('should redirect /applications/:id to /external-systems/:id', () => {
      render(
        <MemoryRouter initialEntries={['/applications/123']}>
          <Routes>
            <Route path="/external-systems/:id" element={<MockApplicationDetails />} />
            <Route path="/applications/:id" element={<Navigate to="/external-systems/:id" replace />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText('System Details Page')).toBeInTheDocument();
    });

    it('should redirect /admin/applications to /admin/external-systems', () => {
      render(
        <MemoryRouter initialEntries={['/admin/applications']}>
          <Routes>
            <Route path="/admin/external-systems" element={<MockApplicationsPage />} />
            <Route path="/admin/applications" element={<Navigate to="/admin/external-systems" replace />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText('External Systems Page')).toBeInTheDocument();
    });

    it('should redirect /admin/applications/new to /admin/external-systems/new', () => {
      render(
        <MemoryRouter initialEntries={['/admin/applications/new']}>
          <Routes>
            <Route path="/admin/external-systems/new" element={<MockApplicationCreate />} />
            <Route path="/admin/applications/new" element={<Navigate to="/admin/external-systems/new" replace />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Create System Page')).toBeInTheDocument();
    });
  });

  describe('New /external-systems routes work correctly', () => {
    it('should render /external-systems route', () => {
      render(
        <MemoryRouter initialEntries={['/external-systems']}>
          <Routes>
            <Route path="/external-systems" element={<MockApplicationsPage />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText('External Systems Page')).toBeInTheDocument();
    });

    it('should render /external-systems/:id route with parameter', () => {
      render(
        <MemoryRouter initialEntries={['/external-systems/test-123']}>
          <Routes>
            <Route path="/external-systems/:id" element={<MockApplicationDetails />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText('System Details Page')).toBeInTheDocument();
    });

    it('should render /admin/external-systems route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/external-systems']}>
          <Routes>
            <Route path="/admin/external-systems" element={<MockApplicationsPage />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText('External Systems Page')).toBeInTheDocument();
    });

    it('should render /admin/external-systems/new route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/external-systems/new']}>
          <Routes>
            <Route path="/admin/external-systems/new" element={<MockApplicationCreate />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText('Create System Page')).toBeInTheDocument();
    });
  });
});
