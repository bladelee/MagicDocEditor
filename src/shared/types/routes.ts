/**
 * Route type definitions
 */
import type { ComponentType } from 'react';

export interface RouteConfig {
  path: string;
  component: ComponentType;
  children?: RouteConfig[];
}

export interface RouteParams {
  workspaceId: string;
  pageId?: string;
}
