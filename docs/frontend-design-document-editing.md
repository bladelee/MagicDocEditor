# 文档基础编辑功能前端设计文档

**功能模块**: 文档基础编辑 (US-001, US-002)
**版本**: 1.0.0
**最后更新**: 2025-01-16

---

## 📋 目录

1. [功能需求](#功能需求)
2. [当前实现状态](#当前实现状态)
3. [缺失功能设计](#缺失功能设计)
4. [技术实现方案](#技术实现方案)
5. [API对接](#api对接)
6. [性能优化](#性能优化)

---

## 功能需求

### US-001: 手动创建并编辑文档

**验收准则**:

1. ✅ 创建空白文档，默认标题"Untitled Document"
2. ✅ 文本输入/删除/修改，光标位置实时响应（延迟≤100ms）
3. ⚠️ **基础格式调整**：标题（H1-H6）、粗体/斜体/下划线、有序/无序列表、代码块
4. ✅ 编辑内容5秒内自动同步至云端
5. ✅ 支持手动触发"保存"按钮
6. ❌ **撤销/重做**：至少保留50步操作记录

### US-002: 文档格式预览与排版优化

**验收准则**:

1. ❌ **预览模式切换**
2. ❌ **段落间距调整、文本对齐**
3. ⚠️ **代码块语法高亮**（至少覆盖TS/JS/HTML/CSS/Markdown）
4. ❌ **格式调整后实时生效**

---

## 当前实现状态

### ✅ 已实现

| 功能       | 实现位置                | 状态                             |
| ---------- | ----------------------- | -------------------------------- |
| 块类型支持 | `blocksuite-editor.tsx` | 段落、标题、列表、代码块、分割线 |
| 块 CRUD    | `blocksuite-editor.tsx` | 完整实现                         |
| 自动保存   | `blocksuite-editor.tsx` | 1秒延迟保存到 localStorage       |
| 块类型转换 | `blocksuite-editor.tsx` | 基础支持                         |
| 字符统计   | `blocksuite-editor.tsx` | 已实现                           |

### ❌ 缺失功能

| 功能                               | 优先级 | 影响范围     |
| ---------------------------------- | ------ | ------------ |
| **撤销/重做**                      | 🔴 高  | 核心用户体验 |
| **富文本格式**（粗体/斜体/下划线） | 🔴 高  | 基础编辑需求 |
| **预览模式**                       | 🟡 中  | 用户便利性   |
| **段落间距/对齐**                  | 🟡 中  | 排版美观     |
| **代码语法高亮**                   | 🟡 中  | 开发者体验   |

---

## 缺失功能设计

### 1. 撤销/重做功能

#### 设计方案

**架构选择**: 使用命令模式（Command Pattern）

```typescript
// src/web/editor/commands.ts

/**
 * 编辑命令接口
 */
interface EditorCommand {
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
  canExecute(): boolean;
}

/**
 * 文本插入命令
 */
class InsertTextCommand implements EditorCommand {
  constructor(
    private editor: BlocksuiteEditor,
    private blockId: string,
    private text: string,
    private position: number
  ) {}

  execute() {
    const block = this.editor.getBlock(this.blockId);
    this.originalContent = block.content;
    block.content = block.content.slice(0, this.position) + this.text + block.content.slice(this.position);
  }

  undo() {
    const block = this.editor.getBlock(this.blockId);
    block.content = this.originalContent;
  }

  canExecute(): boolean {
    return !!this.editor.getBlock(this.blockId);
  }
}

/**
 * 块删除命令
 */
class DeleteBlockCommand implements EditorCommand {
  // ... 类似实现
}

/**
 * 块格式更改命令
 */
class ChangeFormatCommand implements EditorCommand {
  // ... 类似实现
}
```

**历史栈管理器**:

```typescript
// src/web/editor/history-manager.ts

export class HistoryManager {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private maxSize = 50; // 最多保留50步

  // 执行命令
  async execute(command: EditorCommand) {
    if (!command.canExecute()) return;

    await command.execute();

    // 添加到撤销栈
    this.undoStack.push(command);

    // 限制栈大小
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    // 清空重做栈（新操作使之前的重做失效）
    this.redoStack = [];
  }

  // 撤销
  async undo() {
    const command = this.undoStack.pop();
    if (command) {
      await command.undo();
      this.redoStack.push(command);
    }
  }

  // 重做
  async redo() {
    const command = this.redoStack.pop();
    if (command) {
      await command.execute();
      this.undoStack.push(command);
    }
  }

  // 检查是否可以撤销
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  // 检查是否可以重做
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // 清空历史
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  // 保存检查点（用于手动保存）
  createCheckpoint(): string {
    const id = generateId();
    // 保存当前状态快照
    return id;
  }

  // 恢复到检查点
  restoreCheckpoint(checkpointId: string) {
    // 恢复到指定检查点
  }
}
```

**集成到编辑器**:

```typescript
// src/web/components/blocksuite-editor.tsx

export const BlocksuiteEditor: React.FC<Props> = ({ docId }) => {
  const history = useRef(new HistoryManager());

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.current.undo();
      }

      // Ctrl+Shift+Z 或 Ctrl+Y: 重做
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        history.current.redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 包装所有编辑操作
  const insertText = (blockId: string, text: string, position: number) => {
    const command = new InsertTextCommand(editorRef.current, blockId, text, position);
    history.current.execute(command);
  };

  const deleteBlock = (blockId: string) => {
    const command = new DeleteBlockCommand(editorRef.current, blockId);
    history.current.execute(command);
  };

  // 暴露撤销/重做状态
  const canUndo = history.current.canUndo();
  const canRedo = history.current.canRedo();

  return (
    <div className="editor-container">
      {/* 工具栏 */}
      <Toolbar>
        <ToolbarButton
          disabled={!canUndo}
          onClick={() => history.current.undo()}
          icon="undo"
          tooltip="撤销 (Ctrl+Z)"
        />
        <ToolbarButton
          disabled={!canRedo}
          onClick={() => history.current.redo()}
          icon="redo"
          tooltip="重做 (Ctrl+Shift+Z)"
        />
      </Toolbar>

      {/* 编辑器主体 */}
      <EditorContent />
    </div>
  );
};
```

### 2. 富文本格式功能

#### 设计方案

**使用 Selection API + document.execCommand()**

```typescript
// src/web/editor/rich-text-editor.ts

export class RichTextEditor {
  private selection: Selection | null = null;

  constructor(private contentEditable: HTMLElement) {
    this.selection = window.getSelection();
  }

  // 加粗
  bold() {
    document.execCommand('bold', false);
    this.notifyChange();
  }

  // 斜体
  italic() {
    document.execCommand('italic', false);
    this.notifyChange();
  }

  // 下划线
  underline() {
    document.execCommand('underline', false);
    this.notifyChange();
  }

  // 标题
  setHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
    document.execCommand('formatBlock', false, `h${level}`);
    this.notifyChange();
  }

  // 有序列表
  insertOrderedList() {
    document.execCommand('insertOrderedList', false);
    this.notifyChange();
  }

  // 无序列表
  insertUnorderedList() {
    document.execCommand('insertUnorderedList', false);
    this.notifyChange();
  }

  // 移除格式
  removeFormat() {
    document.execCommand('removeFormat', false);
    this.notifyChange();
  }

  // 检查当前格式状态
  getFormatState() {
    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      // ... 其他状态
    };
  }

  private notifyChange() {
    // 触发内容变更事件
    const event = new CustomEvent('content-change', {
      detail: { content: this.contentEditable.innerHTML },
    });
    this.contentEditable.dispatchEvent(event);
  }
}
```

**格式工具栏组件**:

```typescript
// src/web/components/format-toolbar.tsx

interface FormatToolbarProps {
  onFormatChange?: (format: FormatState) => void;
}

export const FormatToolbar: React.FC<FormatToolbarProps> = ({ onFormatChange }) => {
  const editor = useRichTextEditor();
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    heading: null,
  });

  // 监听选区变化，更新格式状态
  useEffect(() => {
    const updateFormatState = () => {
      setFormatState(editor.getFormatState());
    };

    document.addEventListener('selectionchange', updateFormatState);
    return () => document.removeEventListener('selectionchange', updateFormatState);
  }, [editor]);

  const handleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        editor.bold();
        break;
      case 'italic':
        editor.italic();
        break;
      case 'underline':
        editor.underline();
        break;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        editor.setHeading(parseInt(format[1]));
        break;
      // ... 其他格式
    }

    // 更新状态
    setFormatState(editor.getFormatState());
    onFormatChange?.(editor.getFormatState());
  };

  return (
    <div className="format-toolbar">
      <ToolbarButton
        active={formatState.bold}
        onClick={() => handleFormat('bold')}
        icon="bold"
        tooltip="粗体 (Ctrl+B)"
      />
      <ToolbarButton
        active={formatState.italic}
        onClick={() => handleFormat('italic')}
        icon="italic"
        tooltip="斜体 (Ctrl+I)"
      />
      <ToolbarButton
        active={formatState.underline}
        onClick={() => handleFormat('underline')}
        icon="underline"
        tooltip="下划线 (Ctrl+U)"
      />

      <ToolbarSeparator />

      <HeadingSelect
        value={formatState.heading}
        onChange={(level) => handleFormat(`h${level}`)}
      />

      <ToolbarSeparator />

      <ToolbarButton
        onClick={() => handleFormat('insertOrderedList')}
        icon="list-ordered"
        tooltip="有序列表"
      />
      <ToolbarButton
        onClick={() => handleFormat('insertUnorderedList')}
        icon="list-unordered"
        tooltip="无序列表"
      />
    </div>
  );
};
```

### 3. 预览模式

#### 设计方案

```typescript
// src/web/components/preview-mode.tsx

interface PreviewModeProps {
  content: Block[];
  onEdit: () => void;
}

export const PreviewMode: React.FC<PreviewModeProps> = ({ content, onEdit }) => {
  return (
    <div className="preview-mode">
      {/* 预览工具栏 */}
      <div className="preview-toolbar">
        <button onClick={onEdit} className="edit-button">
          <EditIcon /> 返回编辑
        </button>
        <div className="preview-actions">
          <button onClick={() => window.print()} title="打印">
            <PrintIcon />
          </button>
          <button onClick={handleExportPDF} title="导出PDF">
            <PDFIcon />
          </button>
        </div>
      </div>

      {/* 预览内容 */}
      <div className="preview-content">
        {content.map((block) => (
          <PreviewBlock key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
};

const PreviewBlock: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.type) {
    case 'h1':
      return <h1>{block.content}</h1>;
    case 'h2':
      return <h2>{block.content}</h2>;
    case 'paragraph':
      return <p>{block.content}</p>;
    case 'code':
      return (
        <CodeHighlight
          code={block.content}
          language={block.props?.language || 'javascript'}
        />
      );
    case 'list':
      return <ul>{block.children.map(child => <li key={child.id}>{child.content}</li>)}</ul>;
    default:
      return <div>{block.content}</div>;
  }
};
```

### 4. 段落间距和对齐

#### 设计方案

```typescript
// src/web/components/paragraph-settings.tsx

interface ParagraphSettingsProps {
  blockId: string;
  onChange: (settings: ParagraphSettings) => void;
}

interface ParagraphSettings {
  lineHeight: number;      // 行高 1.0-3.0
  letterSpacing: number;   // 字间距 -2px-10px
  textAlign: 'left' | 'center' | 'right' | 'justify';
  marginTop: number;      // 上边距 0-100px
  marginBottom: number;   // 下边距 0-100px
}

export const ParagraphSettings: React.FC<ParagraphSettingsProps> = ({
  blockId,
  onChange
}) => {
  const [settings, setSettings] = useState<ParagraphSettings>({
    lineHeight: 1.5,
    letterSpacing: 0,
    textAlign: 'left',
    marginTop: 8,
    marginBottom: 8,
  });

  const handleChange = (key: keyof ParagraphSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onChange(newSettings);
  };

  return (
    <div className="paragraph-settings">
      {/* 对齐方式 */}
      <div className="setting-group">
        <label>对齐方式</label>
        <ButtonGroup>
          <Button
            active={settings.textAlign === 'left'}
            onClick={() => handleChange('textAlign', 'left')}
          >
            左对齐
          </Button>
          <Button
            active={settings.textAlign === 'center'}
            onClick={() => handleChange('textAlign', 'center')}
          >
            居中
          </Button>
          <Button
            active={settings.textAlign === 'right'}
            onClick={() => handleChange('textAlign', 'right')}
          >
            右对齐
          </Button>
          <Button
            active={settings.textAlign === 'justify'}
            onClick={() => handleChange('textAlign', 'justify')}
          >
            两端对齐
          </Button>
        </ButtonGroup>
      </div>

      {/* 行高 */}
      <div className="setting-group">
        <label>行高: {settings.lineHeight}</label>
        <Slider
          min={1.0}
          max={3.0}
          step={0.1}
          value={settings.lineHeight}
          onChange={(value) => handleChange('lineHeight', value)}
        />
      </div>

      {/* 字间距 */}
      <div className="setting-group">
        <label>字间距: {settings.letterSpacing}px</label>
        <Slider
          min={-2}
          max={10}
          step={0.5}
          value={settings.letterSpacing}
          onChange={(value) => handleChange('letterSpacing', value)}
        />
      </div>

      {/* 段落间距 */}
      <div className="setting-group">
        <label>段落间距</label>
        <div className="spacing-inputs">
          <NumberInput
            label="上"
            unit="px"
            value={settings.marginTop}
            onChange={(value) => handleChange('marginTop', value)}
          />
          <NumberInput
            label="下"
            unit="px"
            value={settings.marginBottom}
            onChange={(value) => handleChange('marginBottom', value)}
          />
        </div>
      </div>
    </div>
  );
};
```

**应用样式**:

```typescript
// 样式应用到块
const applyParagraphStyles = (block: Block, settings: ParagraphSettings) => {
  return {
    ...block,
    style: {
      lineHeight: settings.lineHeight,
      letterSpacing: `${settings.letterSpacing}px`,
      textAlign: settings.textAlign,
      marginTop: `${settings.marginTop}px`,
      marginBottom: `${settings.marginBottom}px`,
    },
  };
};
```

### 5. 代码语法高亮

#### 设计方案

**使用 Shiki（推荐）或 Prism.js**

```typescript
// src/web/lib/code-highlight.ts

import { codeToHtml } from 'shiki';

export class CodeHighlighter {
  private highlighter: any = null;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.initHighlighter();
  }

  private async initHighlighter() {
    const { createHighlighter } = await import('shiki');
    this.highlighter = await createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: ['javascript', 'typescript', 'jsx', 'tsx', 'html', 'css', 'markdown', 'python', 'java', 'go', 'rust'],
    });
  }

  async highlight(code: string, lang: string, theme: 'light' | 'dark' = 'light') {
    await this.ready;

    const html = this.highlighter.codeToHtml(code, {
      lang: lang || 'text',
      theme: theme === 'dark' ? 'github-dark' : 'github-light',
    });

    return html;
  }
}

// 单例实例
export const codeHighlighter = new CodeHighlighter();
```

**代码块组件**:

```typescript
// src/web/components/code-block.tsx

interface CodeBlockProps {
  code: string;
  language?: string;
  theme?: 'light' | 'dark';
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'javascript',
  theme = 'light'
}) => {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    codeHighlighter.highlight(code, language, theme).then(html => {
      setHighlightedCode(html);
      setLoading(false);
    });
  }, [code, language, theme]);

  if (loading) {
    return <pre className="code-block loading">{code}</pre>;
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <span className="language-badge">{language}</span>
        <CopyButton text={code} />
      </div>
      <div
        className="code-content"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </div>
  );
};
```

**Shadow DOM 样式隔离**（嵌入场景）:

```typescript
// 确保高亮样式不与宿主应用冲突
export const CodeBlockShadow: React.FC<CodeBlockProps> = (props) => {
  const shadowRoot = useRef<HTMLDivElement>(null);
  const shadowHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shadowHost.current && !shadowHost.current.shadowRoot) {
      const shadow = shadowHost.current.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          /* Shiki 样式隔离 */
          .shiki { padding: 1em; }
          /* 其他样式... */
        </style>
        <div class="code-container"></div>
      `;
      shadowRoot.current = shadow.querySelector('.code-container') as HTMLDivElement;
    }
  }, []);

  useEffect(() => {
    if (shadowRoot.current) {
      codeHighlighter.highlight(props.code, props.language).then(html => {
        shadowRoot.current!.innerHTML = html;
      });
    }
  }, [props.code, props.language]);

  return <div ref={shadowHost} className="code-block-shadow" />;
};
```

---

## 技术实现方案

### 组件重构计划

```typescript
// src/web/components/blocksuite-editor.tsx (重构后)

interface BlocksuiteEditorProps {
  docId: string;
  mode: 'edit' | 'preview';
  onModeChange?: (mode: 'edit' | 'preview') => void;
}

export const BlocksuiteEditor: React.FC<BlocksuiteEditorProps> = ({
  docId,
  mode,
  onModeChange
}) => {
  // 历史管理器
  const history = useEditorHistory();

  // 富文本编辑器
  const richText = useRichTextEditor();

  // 代码高亮
  const highlighter = useCodeHighlighter();

  // 撤销/重做状态
  const { canUndo, canRedo, undo, redo } = history;

  return (
    <div className="blocksuite-editor" data-mode={mode}>
      {/* 工具栏 */}
      {mode === 'edit' && (
        <>
          <FormatToolbar
            formatState={richText.getFormatState()}
            onFormat={richText.executeFormat}
          />
          <EditToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onPreview={() => onModeChange?.('preview')}
          />
        </>
      )}

      {/* 编辑/预览模式切换 */}
      {mode === 'preview' ? (
        <PreviewMode
          content={blocks}
          onEdit={() => onModeChange?.('edit')}
        />
      ) : (
        <EditorContent
          blocks={blocks}
          onBlockChange={handleBlockChange}
          richText={richText}
          highlighter={highlighter}
        />
      )}

      {/* 状态栏 */}
      <StatusBar
        wordCount={wordCount}
        lastSaved={lastSaved}
        saveStatus={saveStatus}
      />
    </div>
  );
};
```

### Hook 实现

```typescript
// src/web/hooks/use-editor-history.ts

export const useEditorHistory = () => {
  const history = useMemo(() => new HistoryManager(), []);

  const undo = useCallback(() => history.undo(), [history]);
  const redo = useCallback(() => history.redo(), [history]);
  const canUndo = useCallback(() => history.canUndo(), [history]);
  const canRedo = useCallback(() => history.canRedo(), [history]);

  return {
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    execute: (command: EditorCommand) => history.execute(command),
  };
};

// src/web/hooks/use-rich-text-editor.ts

export const useRichTextEditor = () => {
  const editor = useMemo(() => new RichTextEditor(contentEditable), []);

  const getFormatState = useCallback(() => editor.getFormatState(), [editor]);
  const executeFormat = useCallback(
    (format: string, ...args: any[]) => {
      switch (format) {
        case 'bold':
          editor.bold();
          break;
        // ... 其他格式
      }
    },
    [editor]
  );

  return {
    getFormatState,
    executeFormat,
  };
};
```

---

## API对接

### 与后端同步

```typescript
// src/web/services/document-sync.ts

export class DocumentSyncService {
  private docId: string;
  private lastSyncTime: number = 0;
  private syncInterval: number = 5000; // 5秒

  async syncContent(content: Block[]): Promise<void> {
    try {
      await documentService.updateDoc(this.docId, {
        content: JSON.stringify(content),
      });

      this.lastSyncTime = Date.now();
      this.updateSaveStatus('saved');
    } catch (error) {
      this.updateSaveStatus('error');
      throw error;
    }
  }

  // 自动同步
  startAutoSync(getContent: () => Block[]) {
    const intervalId = setInterval(async () => {
      try {
        await this.syncContent(getContent());
      } catch (error) {
        console.error('Auto sync failed:', error);
      }
    }, this.syncInterval);

    return () => clearInterval(intervalId);
  }

  // 手动保存
  async manualSave(content: Block[]) {
    await this.syncContent(content);
  }
}
```

---

## 性能优化

### 大文档优化

```typescript
// 虚拟滚动渲染
import { useVirtualizer } from '@tanstack/react-virtual';

export const VirtualizedEditor: React.FC<{ blocks: Block[] }> = ({ blocks }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // 估计每个块高度
    overscan: 5, // 预渲染5个块
  });

  return (
    <div ref={parentRef} className="editor-scroll-container" style={{ height: '100vh' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualBlock) => {
          const block = blocks[virtualBlock.index];
          return (
            <div
              key={virtualBlock.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualBlock.size}px`,
                transform: `translateY(${virtualBlock.start}px)`,
              }}
            >
              <BlockRenderer block={block} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### 防抖保存

```typescript
import { debounce } from 'lodash-es';

// 防抖保存（5秒内无更改才保存）
const debouncedSave = debounce(async content => {
  await documentService.updateDoc(docId, { content });
}, 5000);
```

---

## 实现优先级

### Phase 1: 核心功能（必须实现）

- [ ] 撤销/重做（50步历史）
- [ ] 富文本格式（粗体/斜体/下划线）
- [ ] 格式工具栏

### Phase 2: 增强功能（重要）

- [ ] 预览模式
- [ ] 段落间距和对齐
- [ ] 代码语法高亮

### Phase 3: 优化功能（可选）

- [ ] 虚拟滚动（大文档性能）
- [ ] 键盘快捷键扩展
- [ ] 更多格式选项

---

**文档版本**: 1.0
**最后更新**: 2025-01-16
**预计工时**: Phase 1 (3-4天), Phase 2 (2-3天), Phase 3 (2-3天)
