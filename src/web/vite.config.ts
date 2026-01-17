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
      '@': resolve(__dirname, '.'),
      '@src': resolve(__dirname, '.'),
      '@web': resolve(__dirname, '.'),
      '@lib': resolve(__dirname, '.'),
      '@shared': resolve(__dirname, '../shared'),
      '@config': resolve(__dirname, '../config'),
    },
  },

  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    // 不配置代理，让前端直接访问后端
    // 前端通过 SSH proxy 访问后端: http://localhost:10003/graphql
  },

  // 构建配置
  build: {
    target: 'esnext',
    outDir: resolve(__dirname, '../dist'),
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
      '@apollo/client',
      'graphql',
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
