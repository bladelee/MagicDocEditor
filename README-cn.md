# MagicDocEditor AI文档编辑器

英文文档请参考 [README.md](README.md)

## 项目介绍

一款集**嵌入式集成、AI智能创作、离线编辑、云端同步、模板生成**于一体的轻量文档工具，可无缝嵌入多端应用。

![Image](https://p3-flow-imagex-sign.byteimg.com/tos-cn-i-a9rns2rl98/4d0771c7c9cc42ee841b148b8b22ad85.png~tplv-noop.jpeg?rk3s=49177a0b&x-expires=1768645027&x-signature=kLb%2FvkAK6rG46h77ni2oPdoHXlA%3D&resource_key=fe7820ca-5e9f-46a8-aeb2-8cd9e57eddfe&resource_key=fe7820ca-5e9f-46a8-aeb2-8cd9e57eddfe)

## 核心特性

- **嵌入式适配**：支持嵌入Web应用，无需跳转外部工具，适配定制化文档生成场景。

- **AI辅助创作**：一键生成内容、智能润色校对、风格适配，大幅降低创作门槛，提升文档质量。

- **离线&云端协同**：离线可正常编辑并自动缓存，联网后即时同步云端，无需手动保存，杜绝内容丢失。

- **模板化生成**：内置多场景精品模板，一键套用并替换核心信息，快速产出标准化文档。

## 嵌入式集成范例

以下为Web端嵌入式集成基础代码，包含初始化、离线切换、模板调用核心功能，可直接粘贴适配。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>嵌入式AI文档编辑器</title>
    <script src="https://your-sdk-url.com/ai-doc-editor-sdk.min.js"></script>
    <style>
      #editor-container {
        width: 100%;
        height: 600px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }
    </style>
  </head>
  <body>
    <div id="editor-container"></div>
    <script>
      // 初始化编辑器
      const aiDocEditor = new AIDocEditor({
        container: '#editor-container',
        appKey: 'your-app-key',
        mode: 'online',
        cloudSync: true,
        defaultTemplateId: 'template-123',
        onSave: docInfo => console.log('文档保存成功', docInfo),
        onNetworkChange: isOnline => alert(isOnline ? '已切换至在线模式' : '已切换至离线模式'),
      });
      // 模板生成文档
      window.onload = () => aiDocEditor.useTemplate('template-123');
    </script>
  </body>
</html>
```

说明：替换`your-sdk-url`、`your-app-key`、`template-123`为实际配置；支持扩展后端接口、移动端嵌入逻辑。

## 适用场景

个人办公、企业团队协作、教育场景（教案/论文）、创业者文档生成、企业系统定制化集成等。

## 注意事项

- 集成前需申请专属`appKey`，用于权限验证与数据安全管控。

- 离线模式下缓存文件仅本地存储，联网后需确保网络通畅完成云端同步。

- 模板ID需提前在后台配置，支持自定义模板上传与管理。

## 扩展需求

如需后端集成（Java/PHP）嵌入代码或自定义功能开发，可参考项目Wiki或提交Issue。

> （注：文档部分内容可能由 AI 生成）

---
