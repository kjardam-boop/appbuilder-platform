/**
 * Capability Bundles Registry
 * 
 * Maps capability keys to their local bundle implementations.
 * These are used when bundles aren't deployed to storage yet.
 */

import React from 'react';
import type { CapabilityProps } from '../schemas/capability-manifest.schema';

// Lazy load bundles for code splitting
const DocumentManagement = React.lazy(() => import('./document-management/DocumentManagement'));

/**
 * Registry of locally available capability bundles
 */
export const LOCAL_BUNDLES: Record<string, React.LazyExoticComponent<React.ComponentType<CapabilityProps>>> = {
  'document-management': DocumentManagement,
};

/**
 * Check if a capability has a local bundle
 */
export function hasLocalBundle(capabilityKey: string): boolean {
  return capabilityKey in LOCAL_BUNDLES;
}

/**
 * Get a local bundle component
 */
export function getLocalBundle(capabilityKey: string): React.LazyExoticComponent<React.ComponentType<CapabilityProps>> | null {
  return LOCAL_BUNDLES[capabilityKey] || null;
}

