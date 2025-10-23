import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from './breadcrumb';
import { Link } from 'react-router-dom';

export function AppBreadcrumbs({ customLabel }: { customLabel?: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {customLabel ? (
          <BreadcrumbItem>
            <span>{customLabel}</span>
          </BreadcrumbItem>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="#">Seksjon</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
