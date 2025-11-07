import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from './breadcrumb';
import { Link } from 'react-router-dom';

interface BreadcrumbLevel {
  label: string;
  href?: string;
}

interface AppBreadcrumbsProps {
  customLabel?: string;
  levels?: BreadcrumbLevel[];
}

export function AppBreadcrumbs({ customLabel, levels }: AppBreadcrumbsProps) {
  // If levels are provided, use them
  if (levels && levels.length > 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {levels.map((level, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {level.href ? (
                  <BreadcrumbLink asChild>
                    <Link to={level.href}>{level.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="text-foreground">{level.label}</span>
                )}
              </BreadcrumbItem>
              {index < levels.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Fallback to simple version with customLabel
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
            <span className="text-foreground">{customLabel}</span>
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
