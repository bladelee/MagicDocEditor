/**
 * 环境变量配置
 */

export const config = {
  // 应用配置
  app: {
    name: 'AI Document Editor',
    version: '0.1.0',
    env: import.meta.env.MODE,
    isDev: import.meta.env.MODE === 'development',
    isProd: import.meta.env.MODE === 'production',
  },

  // API 配置
  api: {
    graphql: import.meta.env.VITE_GRAPHQL_URL || '/graphql',
    rest: import.meta.env.VITE_API_URL || '/api',
    ws: import.meta.env.VITE_WS_URL || 'ws://localhost:3001/graphql',
  },

  // AI 配置
  ai: {
    enabled: import.meta.env.VITE_AI_ENABLED !== 'false',
    provider: import.meta.env.VITE_AI_PROVIDER || 'openai',
    apiKey: import.meta.env.VITE_AI_API_KEY || '',
    model: import.meta.env.VITE_AI_MODEL || 'gpt-4',
  },

  // 存储配置
  storage: {
    cloud: import.meta.env.VITE_CLOUD_STORAGE !== 'false',
    uploadEndpoint: import.meta.env.VITE_UPLOAD_ENDPOINT || '/api/upload',
  },

  // 功能开关（可以由环境变量覆盖）
  features: {
    enableEdgeless: import.meta.env.VITE_ENABLE_EDGELESS === 'true',
    enableDatabase: import.meta.env.VITE_ENABLE_DATABASE === 'true',
    enableSharing: import.meta.env.VITE_ENABLE_SHARING === 'true',
  },
} as const;

export type Config = typeof config;
