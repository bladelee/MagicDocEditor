/**
 * Shared constants
 */

export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    SIGN_IN: '/sign-in',
    SIGN_UP: '/sign-up',
  },
  WORKSPACE: '/workspace/:workspaceId',
  EDITOR: '/workspace/:workspaceId/:pageId',
  ALL_PAGES: '/workspace/:workspaceId/all',
  TRASH: '/workspace/:workspaceId/trash',
  SETTINGS: '/workspace/:workspaceId/settings',
} as const;

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
} as const;

export const AI_MODELS = {
  GPT4: 'gpt-4',
  GPT35: 'gpt-3.5-turbo',
  CLAUDE_3: 'claude-3-sonnet',
  GEMINI_PRO: 'gemini-pro',
} as const;

export const AI_ACTIONS = {
  GENERATE: 'generate',
  EDIT: 'edit',
  TRANSLATE: 'translate',
  SUMMARIZE: 'summarize',
  IMPROVE: 'improve',
  EXPAND: 'expand',
  SHORTEN: 'shorten',
} as const;
