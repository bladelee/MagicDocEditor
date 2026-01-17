import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // 路径别名配置
  resolve: {
    alias: {
      '@': resolve(__dirname, '../'),
      '@src': resolve(__dirname, '../'),
      '@web': resolve(__dirname, '../web'),
      '@shared': resolve(__dirname, '../shared'),
      '@config': resolve(__dirname, '../config'),

      // Blocksuite 模块
      '@blocksuite/affine': resolve(__dirname, '../../blocksuite/affine'),
      '@blocksuite/affine-block-root': resolve(
        __dirname,
        '../../blocksuite/affine-block-root'
      ),
      '@blocksuite/affine-components': resolve(
        __dirname,
        '../../blocksuite/affine-components'
      ),
      '@blocksuite/affine-shared': resolve(
        __dirname,
        '../../blocksuite/affine-shared'
      ),
      '@blocksuite/global': resolve(
        __dirname,
        '../../blocksuite/framework/global'
      ),
      '@blocksuite/std': resolve(__dirname, '../../blocksuite/framework/std'),
      '@blocksuite/icons': resolve(__dirname, '../../blocksuite/presets/icons'),
      '@blocksuite/affine-ext-loader': resolve(
        __dirname,
        '../../blocksuite/affine-ext-loader'
      ),

      // AFFiNE 核心模块
      '@affine/core': resolve(__dirname, '../../packages/frontend/core/src'),
      '@affine/component': resolve(
        __dirname,
        '../../packages/frontend/component/src'
      ),
      '@affine/env': resolve(__dirname, '../../packages/frontend/env/src'),
      '@affine/i18n': resolve(__dirname, '../../packages/frontend/i18n/src'),
      '@affine/nbstore': resolve(
        __dirname,
        '../../packages/common/nbstore/src'
      ),
      '@affine/track': resolve(__dirname, '../../packages/frontend/track'),
      '@toeverything/infra': resolve(
        __dirname,
        '../../packages/common/infra/src'
      ),
    },
  },

  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    proxy: {
      // GraphQL API 代理
      '/graphql': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 其他 API 代理
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  // 构建配置
  build: {
    target: 'esnext',
    outDir: resolve(__dirname, '../../dist/web'),
    emptyOutDir: true,
    sourcemap: mode === 'development',

    // 代码分割配置
    rollupOptions: {
      output: {
        manualChunks: id => {
          // Blocksuite 核心单独分包
          if (id.includes('@blocksuite')) {
            return 'blocksuite';
          }

          // React 相关单独分包
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }

          // 路由相关
          if (id.includes('react-router')) {
            return 'router';
          }

          // AFFiNE 核心模块
          if (id.includes('@affine/core') || id.includes('@affine/component')) {
            return 'affine-core';
          }

          // 基础设施
          if (
            id.includes('@toeverything/infra') ||
            id.includes('@affine/nbstore')
          ) {
            return 'infra';
          }

          // 其他 vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },

    // 警告阈值调整
    chunkSizeWarningLimit: 1000,
  },

  // 环境变量前缀
  envPrefix: ['VITE_', 'AFFINE_'],

  // 优化配置
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@blocksuite/affine',
      '@blocksuite/std',
    ],
  },

  // 定义全局常量
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    __AFFINE_ELECTRON__: 'false',
    __AFFINE_MOBILE__: 'false',
    __AFFINE_SERVER__: 'false',
  },
}));
