/**
 * 功能开关配置
 * 用于控制启用的功能模块
 */

export const features = {
  // 端能力
  platforms: {
    web: true,
    electron: false,
    mobile: false,
    ios: false,
    android: false,
  },

  // 编辑器功能
  editor: {
    page: true, // 文档模式
    edgeless: false, // 白板模式
    database: false, // 数据库视图
  },

  // AI 功能
  ai: {
    enabled: true, // AI 总开关
    chat: true, // AI 聊天
    generateDoc: true, // 生成完整文档
    localEdit: true, // 局部修改
    mindMap: false, // 思维导图
    presentation: false, // 幻灯片
    image: false, // AI 生成图片
    translate: true, // 翻译
    summarize: true, // 总结
    improve: true, // 润色
  },

  // 存储策略
  storage: {
    cloud: true, // 云端存储
    local: false, // 本地存储
    indexedDB: false, // IndexedDB
    sqlite: false, // SQLite
  },

  // 用户功能
  user: {
    auth: true, // 认证
    workspace: true, // 工作区
    sharing: false, // 分享（初始版本关闭）
    collaboration: true, // 协作
    comments: false, // 评论（可选）
  },

  // 其他功能
  misc: {
    telemetry: false, // 遥测
    tracking: false, // 追踪
    debug: process.env.NODE_ENV === 'development',
  },
} as const;

// 类型导出
export type Features = typeof features;
