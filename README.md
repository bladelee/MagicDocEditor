# MagicDocEditor AI Document Editor

For Chinese documentation, please refer to [README-cn.md](README-cn.md)

## Project Introduction

A lightweight document tool that integrates **embedded integration, AI intelligent creation, offline editing, cloud synchronization, and template generation**, seamlessly embeddable in multi-platform applications.

![readme](https://github.com/user-attachments/assets/568188e8-0589-4cee-a81c-93a1396844c0)


## Core Features

- **Embedded Adaptation**: Supports embedding in Web applications without jumping to external tools, adapting to customized document generation scenarios.

- **AI-Assisted Creation**: One-click content generation, intelligent polishing and proofreading, style adaptation, greatly reducing creation thresholds and improving document quality.

- **Offline & Cloud Collaboration**: Normal editing and automatic caching offline, instant synchronization to the cloud when online, no manual saving required, eliminating content loss.

- **Template-Based Generation**: Built-in high-quality templates for multiple scenarios, one-click application and core information replacement, quickly producing standardized documents.

## Embedded Integration Example

The following is the basic code for Web-side embedded integration, including initialization, offline switching, and template calling core functions, which can be directly pasted and adapted.

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Embedded AI Document Editor</title>
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
      // Initialize editor
      const aiDocEditor = new AIDocEditor({
        container: '#editor-container',
        appKey: 'your-app-key',
        mode: 'online',
        cloudSync: true,
        defaultTemplateId: 'template-123',
        onSave: docInfo => console.log('Document saved successfully', docInfo),
        onNetworkChange: isOnline => alert(isOnline ? 'Switched to online mode' : 'Switched to offline mode'),
      });
      // Generate document from template
      window.onload = () => aiDocEditor.useTemplate('template-123');
    </script>
  </body>
</html>
```

Note: Replace `your-sdk-url`, `your-app-key`, and `template-123` with actual configurations; supports backend interface extension and mobile embedding logic.

## Application Scenarios

Personal office, enterprise team collaboration, educational scenarios (teaching plans/papers), entrepreneur document generation, enterprise system customized integration, etc.

## Notes

- A dedicated `appKey` is required before integration for permission verification and data security control.

- Cache files are only stored locally in offline mode; ensure network connectivity to complete cloud synchronization when online.

- Template IDs need to be configured in the background in advance, supporting custom template upload and management.

## Extension Requirements

For backend integration (Java/PHP) embedding code or custom function development, please refer to the project Wiki or submit an Issue.

> (Note: Some parts of this document may be AI-generated)

---
