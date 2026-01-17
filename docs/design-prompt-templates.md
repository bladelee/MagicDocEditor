# Prompt 模板功能设计文档

**功能模块**: Prompt 模板管理
**类型**: 前端 + 后端设计
**版本**: 1.0.0
**最后更新**: 2025-01-16

---

## 📋 目录

1. [功能概述](#功能概述)
2. [需求分析](#需求分析)
3. [数据模型设计](#数据模型设计)
4. [后端API设计](#后端api设计)
5. [前端UI设计](#前端ui设计)
6. [实现方案](#实现方案)
7. [API对接](#api对接)

---

## 功能概述

### 核心功能

Prompt 模板功能允许用户预定义常用的 AI 提示词模板，快速生成标准化文档，提升创作效率。

### 主要特性

1. **模板库管理**: 创建、编辑、删除、分类 Prompt 模板
2. **参数化模板**: 支持变量占位符，用户填写参数生成内容
3. **快捷使用**: AI Chat 面板直接调用模板
4. **收藏管理**: 收藏常用模板，快速访问
5. **权限控制**: 管理员维护模板，普通用户使用
6. **嵌入场景支持**: 宿主应用可自定义模板

---

## 需求分析

### 用户故事

**US-005: Prompt模板生成文档**

**验收准则**:

1. AI Chat面板提供「模板库」入口，展示分类模板
2. 选择模板后，提示输入关键参数
3. 填充参数后生成文档
4. 支持收藏常用模板
5. 模板内容基于MD格式存储，支持管理员更新
6. 嵌入场景下可加载宿主应用自定义模板

### 用户角色

| 角色             | 权限                       |
| ---------------- | -------------------------- |
| **普通用户**     | 查看、使用、收藏模板       |
| **工作区管理员** | 创建、编辑、删除模板       |
| **系统管理员**   | 管理所有模板、管理模板分类 |

---

## 数据模型设计

### GraphQL Schema

```graphql
# Prompt 模板类型
type CopilotPrompt {
  id: ID!
  name: String! # 模板名称
  description: String # 描述
  category: String # 分类（如：工作汇报、营销文案、技术文档）
  action: String! # 动作类型（chat/generate/edit）
  model: String! # 使用的模型
  messages: [CopilotMessage!]! # 消息列表（Prompt 内容）
  variables: [PromptVariable!] # 参数定义
  config: CopilotPromptConfig # 模板配置
  workspace: Workspace # 所属工作区
  isPublic: Boolean! # 是否公开（所有工作区可用）
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User
  favoritedBy: [User!]! # 收藏者
  usageCount: Int! # 使用次数
}

# Prompt 参数
type PromptVariable {
  name: String! # 参数名（如：report_period）
  type: PromptVariableType! # 参数类型
  label: String! # 显示标签
  placeholder: String # 占位提示
  required: Boolean! # 是否必填
  defaultValue: String # 默认值
  options: [String] # 选项（枚举类型）
}

enum PromptVariableType {
  TEXT # 文本
  NUMBER # 数字
  DATE # 日期
  SELECT # 单选
  MULTI_SELECT # 多选
  TEXTAREA # 长文本
}

# Prompt 消息
type CopilotMessage {
  role: MessageRole! # 角色（user/system/assistant）
  content: String! # 消息内容（可包含变量占位符）
  timestamp: DateTime
}

enum MessageRole {
  user
  system
  assistant
}

# Prompt 配置
type CopilotPromptConfig {
  temperature: Float # 温度（0-1）
  maxTokens: Int # 最大token数
  topP: Float # top_p采样
  topK: Int # top_k采样
  stream: Boolean # 是否流式输出
}

# 模板分类
type PromptCategory {
  id: ID!
  name: String! # 分类名称
  icon: String # 图标
  description: String # 描述
  order: Int # 排序
  prompts: [CopilotPrompt!]! # 该分类下的模板
}
```

### 数据示例

```json
{
  "id": "prompt-123",
  "name": "周工作汇报",
  "description": "快速生成周工作汇报文档",
  "category": "工作汇报",
  "action": "generate",
  "model": "gpt-3.5-turbo",
  "variables": [
    {
      "name": "report_period",
      "type": "TEXT",
      "label": "汇报周期",
      "placeholder": "如：2024年第3周",
      "required": true,
      "defaultValue": ""
    },
    {
      "name": "key_achievements",
      "type": "TEXTAREA",
      "label": "关键成果",
      "placeholder": "列出本周完成的主要工作...",
      "required": true,
      "defaultValue": ""
    },
    {
      "name": "challenges",
      "type": "TEXTAREA",
      "label": "遇到的挑战",
      "placeholder": "描述本周遇到的困难...",
      "required": false,
      "defaultValue": ""
    }
  ],
  "messages": [
    {
      "role": "system",
      "content": "你是一个专业的文档写作助手，帮助用户生成工作汇报。"
    },
    {
      "role": "user",
      "content": "请根据以下信息生成一份周工作汇报：\n\n汇报周期：{{report_period}}\n关键成果：\n{{key_achievements}}\n\n遇到的挑战：\n{{challenges}}\n\n请生成一份结构清晰、内容专业的周工作汇报，包含以下部分：\n1. 本周工作概述\n2. 主要成果\n3. 遇到的挑战与解决方案\n4. 下周计划"
    }
  ],
  "config": {
    "temperature": 0.7,
    "maxTokens": 2000,
    "stream": true
  },
  "isPublic": true,
  "usageCount": 150
}
```

---

## 后端API设计

### GraphQL Mutations

```graphql
# 创建模板
mutation CreateCopilotPrompt($name: String!, $description: String, $category: String!, $action: String!, $model: String!, $messages: [CopilotMessageInput!]!, $variables: [PromptVariableInput!], $config: CopilotPromptConfigInput, $isPublic: Boolean) {
  createCopilotPrompt(input: { name: $name, description: $description, category: $category, action: $action, model: $model, messages: $messages, variables: $variables, config: $config, isPublic: $isPublic }) {
    id
    name
    category
    createdAt
  }
}

# 更新模板
mutation UpdateCopilotPrompt($id: ID!, $name: String, $description: String, $category: String, $messages: [CopilotMessageInput!], $variables: [PromptVariableInput!], $config: CopilotPromptConfigInput) {
  updateCopilotPrompt(id: $id, input: { name: $name, description: $description, category: $category, messages: $messages, variables: $variables, config: $config }) {
    id
    name
    updatedAt
  }
}

# 删除模板
mutation DeleteCopilotPrompt($id: ID!) {
  deleteCopilotPrompt(id: $id) {
    id
    success
  }
}

# 使用模板（生成文档）
mutation GenerateDocFromPrompt($promptId: ID!, $values: JSON!) {
  generateDocFromPrompt(promptId: $promptId, values: $values) {
    docId
    content
    tokensUsed
  }
}

# 收藏模板
mutation ToggleFavoritePrompt($id: ID!) {
  toggleFavoritePrompt(id: $id) {
    id
    favorited
  }
}

# 增加使用次数
mutation IncrementPromptUsage($id: ID!) {
  incrementPromptUsage(id: $id) {
    id
    usageCount
  }
}
```

### GraphQL Queries

```graphql
# 列出所有模板
query ListCopilotPrompts($category: String, $workspaceId: ID, $isPublic: Boolean) {
  listCopilotPrompts(category: $category, workspaceId: $workspaceId, isPublic: $isPublic) {
    id
    name
    description
    category
    variables {
      name
      type
      label
      placeholder
      required
      defaultValue
      options
    }
    model
    isPublic
    usageCount
    favorited
    createdAt
    updatedAt
  }
}

# 获取单个模板详情
query GetCopilotPrompt($id: ID!) {
  copilotPrompt(id: $id) {
    id
    name
    description
    category
    action
    model
    messages {
      role
      content
    }
    variables {
      name
      type
      label
      placeholder
      required
      defaultValue
      options
    }
    config {
      temperature
      maxTokens
      stream
    }
    workspace {
      id
      name
    }
    createdBy {
      id
      name
    }
    usageCount
    favorited
    createdAt
    updatedAt
  }
}

# 列出模板分类
query ListPromptCategories {
  listPromptCategories {
    id
    name
    icon
    description
    order
    prompts {
      id
      name
    }
  }
}

# 搜索模板
query SearchPrompts($query: String!) {
  searchPrompts(query: $query) {
    id
    name
    description
    category
    relevanceScore
  }
}
```

### 后端服务实现

```typescript
// packages/backend/server/src/core/copilot/prompt.service.ts

@Injectable()
export class CopilotPromptService {
  constructor(
    @Inject(DocTypeORMRepository) private repo: DocTypeORMRepository),
  ) {}

  /**
   * 创建模板
   */
  async createPrompt(
    userId: string,
    workspaceId: string,
    input: CreatePromptInput
  ): Promise<CopilotPrompt> {
    const prompt = this.repo.create({
      type: 'copilot_prompt',
      workspaceId,
      userId,
      properties: {
        name: input.name,
        description: input.description,
        category: input.category,
        action: input.action,
        model: input.model,
        messages: input.messages,
        variables: input.variables,
        config: input.config,
        isPublic: input.isPublic ?? false,
        usageCount: 0,
        favoritedBy: [],
      },
    });

    await this.repo.save(prompt);
    return prompt;
  }

  /**
   * 使用模板生成文档
   */
  async generateDocFromPrompt(
    promptId: string,
    values: Record<string, any>,
    userId: string
  ): Promise<{ docId: string; content: string; tokensUsed: number }> {
    // 1. 获取模板
    const prompt = await this.getPrompt(promptId);

    // 2. 替换变量
    const filledMessages = this.fillVariables(prompt.messages, values);

    // 3. 调用 AI 生成
    const { content, tokensUsed } = await this.callAI({
      model: prompt.model,
      messages: filledMessages,
      config: prompt.config,
    });

    // 4. 创建文档
    const doc = await this.createDocFromContent(content, prompt.workspaceId);

    // 5. 增加使用次数
    await this.incrementUsage(promptId);

    return {
      docId: doc.id,
      content,
      tokensUsed,
    };
  }

  /**
   * 替换消息中的变量
   */
  private fillVariables(
    messages: CopilotMessage[],
    values: Record<string, any>
  ): CopilotMessage[] {
    return messages.map(msg => ({
      ...msg,
      content: this.replaceVariables(msg.content, values),
    }));
  }

  /**
   * 替换字符串中的变量占位符
   */
  private replaceVariables(
    content: string,
    values: Record<string, any>
  ): string {
    let result = content;

    // 匹配 {{variable_name}} 格式
    const regex = /\{\{(\w+)\}\}/g;

    result = result.replace(regex, (match, key) => {
      if (values.hasOwnProperty(key)) {
        return values[key];
      }
      return match; // 保持原样
    });

    return result;
  }

  /**
   * 调用 AI API
   */
  private async callAI(options: {
    model: string;
    messages: CopilotMessage[];
    config: CopilotPromptConfig;
  }): Promise<{ content: string; tokensUsed: number }> {
    // 调用 OpenAI / Gemini API
    const aiService = new AIService(options.model);
    const response = await aiService.chat({
      messages: options.messages,
      temperature: options.config.temperature,
      maxTokens: options.config.maxTokens,
    });

    return {
      content: response.content,
      tokensUsed: response.totalTokens,
    };
  }

  /**
   * 列出模板
   */
  async listPrompts(filters: {
    category?: string;
    workspaceId?: string;
    isPublic?: boolean;
  }): Promise<CopilotPrompt[]> {
    const query = this.repo.createQuery({
      type: 'copilot_prompt',
      filters: filters,
    });

    return query.findAll();
  }

  /**
   * 搜索模板
   */
  async searchPrompts(query: string): Promise<CopilotPrompt[]> {
    return this.repo.search({
      query,
      fields: ['name', 'description'],
      type: 'copilot_prompt',
    });
  }

  /**
   * 收藏/取消收藏
   */
  async toggleFavorite(promptId: string, userId: string): Promise<boolean> {
    const prompt = await this.getPrompt(promptId);

    if (prompt.favoritedBy.includes(userId)) {
      // 取消收藏
      prompt.favoritedBy = prompt.favoritedBy.filter(id => id !== userId);
    } else {
      // 添加收藏
      prompt.favoritedBy.push(userId);
    }

    await this.repo.save(prompt);
    return prompt.favoritedBy.includes(userId);
  }

  /**
   * 增加使用次数
   */
  async incrementUsage(promptId: string): Promise<void> {
    const prompt = await this.getPrompt(promptId);
    prompt.usageCount += 1;
    await this.repo.save(prompt);
  }
}
```

---

## 前端UI设计

### 组件架构

```
PromptTemplateLibrary (模板库主容器)
├── TemplateCategories (分类标签)
│   └── CategoryTab (分类选项卡)
├── TemplateGrid (模板网格)
│   └── TemplateCard (模板卡片)
├── TemplatePreview (模板预览)
│   ├── TemplateVariablesForm (参数表单)
│   └── TemplateContentPreview (内容预览)
└── TemplateEditor (管理员编辑器)
    ├── BasicInfoForm (基本信息)
    ├── MessagesEditor (消息编辑)
    ├── VariablesEditor (变量编辑)
    └── ConfigEditor (配置编辑)
```

### 模板库主界面

```typescript
// src/web/components/prompt-template-library.tsx

interface PromptTemplateLibraryProps {
  onUseTemplate?: (template: CopilotPrompt, values: Record<string, any>) => void;
}

export const PromptTemplateLibrary: React.FC<PromptTemplateLibraryProps> = ({
  onUseTemplate,
}) => {
  const [categories, setCategories] = useState<PromptCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<CopilotPrompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);

  // 加载分类
  useEffect(() => {
    loadCategories();
  }, []);

  // 加载模板
  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, searchQuery, showFavorites]);

  const loadCategories = async () => {
    try {
      const data = await apolloClient.query({
        query: LIST_PROMPT_CATEGORIES,
      });
      setCategories(data.data.listPromptCategories);
    } catch (error) {
      toast.error('加载分类失败');
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await apolloClient.query({
        query: LIST_PROMPTS,
        variables: {
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          search: searchQuery || undefined,
          favoritesOnly: showFavorites,
        },
      });
      setTemplates(data.data.listCopilotPrompts);
    } catch (error) {
      toast.error('加载模板失败');
    }
  };

  return (
    <div className="prompt-template-library">
      {/* 头部 */}
      <div className="library-header">
        <h2>Prompt 模板库</h2>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="搜索模板..."
        />
        <ToggleButton
          active={showFavorites}
          onChange={setShowFavorites}
          label="仅显示收藏"
        />
      </div>

      {/* 分类标签 */}
      <div className="category-tabs">
        <CategoryTab
          active={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
        >
          全部
        </CategoryTab>
        {categories.map((category) => (
          <CategoryTab
            key={category.id}
            active={selectedCategory === category.id}
            icon={category.icon}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </CategoryTab>
        ))}
      </div>

      {/* 模板网格 */}
      <div className="template-grid">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => {/* 显示模板详情 */}}
            onUse={() => {/* 快速使用 */}}
          />
        ))}
      </div>

      {/* 空状态 */}
      {templates.length === 0 && (
        <EmptyState
          icon="template"
          message={searchQuery ? '没有找到匹配的模板' : '暂无模板'}
        />
      )}
    </div>
  );
};
```

### 模板卡片组件

```typescript
// src/web/components/template-card.tsx

interface TemplateCardProps {
  template: CopilotPrompt;
  onClick: () => void;
  onUse: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onClick,
  onUse,
}) => {
  const [isFavorited, setIsFavorited] = useState(template.favorited);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await apolloClient.mutate({
        mutation: TOGGLE_FAVORITE_PROMPT,
        variables: { id: template.id },
      });
      setIsFavorited(result.data.toggleFavoritePrompt.favorited);
    } catch (error) {
      toast.error('操作失败');
    }
  };

  return (
    <div className="template-card" onClick={onClick}>
      {/* 卡片头部 */}
      <div className="card-header">
        <CategoryIcon category={template.category} />
        <IconButton
          className="favorite-btn"
          onClick={handleToggleFavorite}
        >
          <HeartIcon filled={isFavorited} />
        </IconButton>
      </div>

      {/* 标题和描述 */}
      <div className="card-content">
        <h3 className="template-name">{template.name}</h3>
        <p className="template-description">{template.description}</p>
      </div>

      {/* 元数据 */}
      <div className="card-meta">
        <span className="model-badge">{template.model}</span>
        <span className="usage-count">
          <SparkleIcon /> {template.usageCount}
        </span>
      </div>

      {/* 快速使用按钮 */}
      <Button
        className="use-template-btn"
        onClick={(e) => {
          e.stopPropagation();
          onUse();
        }}
      >
        使用模板
      </Button>
    </div>
  );
};
```

### 模板使用流程

```typescript
// src/web/components/template-use-flow.tsx

interface TemplateUseFlowProps {
  template: CopilotPrompt;
  onGenerate: (content: string) => void;
  onCancel: () => void;
}

export const TemplateUseFlow: React.FC<TemplateUseFlowProps> = ({
  template,
  onGenerate,
  onCancel,
}) => {
  const [step, setStep] = useState<'params' | 'preview' | 'generating'>('params');
  const [values, setValues] = useState<Record<string, any>>({});
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 验证参数
  const validateValues = (): boolean => {
    for (const variable of template.variables) {
      if (variable.required && !values[variable.name]) {
        toast.error(`请填写：${variable.label}`);
        return false;
      }
    }
    return true;
  };

  // 预览生成的内容
  const handlePreview = () => {
    if (!validateValues()) return;

    // 替换变量，预览 prompt
    const preview = fillTemplateVariables(
      template.messages[template.messages.length - 1].content,
      values
    );
    setGeneratedContent(preview);
    setStep('preview');
  };

  // 生成文档
  const handleGenerate = async () => {
    if (!validateValues()) return;

    setIsGenerating(true);
    try {
      const result = await apolloClient.mutate({
        mutation: GENERATE_DOC_FROM_PROMPT,
        variables: {
          promptId: template.id,
          values,
        },
      });

      setGeneratedContent(result.data.generateDocFromPrompt.content);
      setStep('generating');

      // 通知父组件
      onGenerate(result.data.generateDocFromPrompt.content);
    } catch (error) {
      toast.error(`生成失败: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="template-use-dialog">
        {/* 步骤1：填写参数 */}
        {step === 'params' && (
          <>
            <DialogHeader>
              <DialogTitle>{template.name}</DialogTitle>
              <p className="template-desc">{template.description}</p>
            </DialogHeader>

            <div className="template-variables-form">
              {template.variables.map((variable) => (
                <VariableInput
                  key={variable.name}
                  variable={variable}
                  value={values[variable.name]}
                  onChange={(val) => setValues({ ...values, [variable.name]: val })}
                />
              ))}
            </div>

            <DialogFooter>
              <Button onClick={onCancel} variant="secondary">
                取消
              </Button>
              <Button onClick={handlePreview} variant="secondary">
                预览
              </Button>
              <Button onClick={handleGenerate}>
                直接生成
              </Button>
            </DialogFooter>
          </>
        )}

        {/* 步骤2：预览 */}
        {step === 'preview' && (
          <>
            <DialogHeader>
              <DialogTitle>预览 Prompt</DialogTitle>
            </DialogHeader>

            <div className="prompt-preview">
              <pre>{generatedContent}</pre>
            </div>

            <DialogFooter>
              <Button onClick={() => setStep('params')} variant="secondary">
                返回修改
              </Button>
              <Button onClick={handleGenerate}>
                确认生成
              </Button>
            </DialogFooter>
          </>
        )}

        {/* 步骤3：生成中 */}
        {step === 'generating' && (
          <>
            <DialogHeader>
              <DialogTitle>正在生成文档...</DialogTitle>
            </DialogHeader>

            <div className="generating-state">
              <Spinner />
              <p>AI 正在根据模板生成文档，请稍候...</p>
            </div>

            {generatedContent && (
              <div className="generated-content">
                <Markdown>{generatedContent}</Markdown>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

### 参数输入组件

```typescript
// src/web/components/variable-input.tsx

interface VariableInputProps {
  variable: PromptVariable;
  value: any;
  onChange: (value: any) => void;
}

export const VariableInput: React.FC<VariableInputProps> = ({
  variable,
  value,
  onChange,
}) => {
  const inputValue = value || variable.defaultValue;

  switch (variable.type) {
    case 'TEXT':
      return (
        <div className="variable-input">
          <label>
            {variable.label}
            {variable.required && <span className="required">*</span>}
          </label>
          <Input
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={variable.placeholder}
            required={variable.required}
          />
        </div>
      );

    case 'NUMBER':
      return (
        <div className="variable-input">
          <label>
            {variable.label}
            {variable.required && <span className="required">*</span>}
          </label>
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            placeholder={variable.placeholder}
            required={variable.required}
          />
        </div>
      );

    case 'DATE':
      return (
        <div className="variable-input">
          <label>
            {variable.label}
            {variable.required && <span className="required">*</span>}
          </label>
          <Input
            type="date"
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            required={variable.required}
          />
        </div>
      );

    case 'TEXTAREA':
      return (
        <div className="variable-input">
          <label>
            {variable.label}
            {variable.required && <span className="required">*</span>}
          </label>
          <Textarea
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={variable.placeholder}
            required={variable.required}
            rows={4}
          />
        </div>
      );

    case 'SELECT':
      return (
        <div className="variable-input">
          <label>
            {variable.label}
            {variable.required && <span className="required">*</span>}
          </label>
          <Select
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            required={variable.required}
          >
            <option value="">请选择...</option>
            {variable.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      );

    case 'MULTI_SELECT':
      return (
        <div className="variable-input">
          <label>
            {variable.label}
            {variable.required && <span className="required">*</span>}
          </label>
          <MultiSelect
            options={variable.options || []}
            value={inputValue || []}
            onChange={onChange}
            placeholder={variable.placeholder}
          />
        </div>
      );

    default:
      return null;
  }
};
```

### 模板编辑器（管理员）

```typescript
// src/web/components/template-editor.tsx

interface TemplateEditorProps {
  template?: CopilotPrompt;
  mode: 'create' | 'edit';
  onSave?: (template: CopilotPrompt) => void;
  onCancel?: () => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  mode,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<CopilotPrompt>>(
    template || {
      name: '',
      description: '',
      category: '',
      action: 'generate',
      model: 'gpt-3.5-turbo',
      messages: [],
      variables: [],
      config: {
        temperature: 0.7,
        maxTokens: 2000,
        stream: true,
      },
      isPublic: false,
    }
  );

  const [activeTab, setActiveTab] = useState<'basic' | 'messages' | 'variables' | 'config'>('basic');

  const handleSave = async () => {
    try {
      if (mode === 'create') {
        const result = await apolloClient.mutate({
          mutation: CREATE_PROMPT,
          variables: formData,
        });
        onSave?.(result.data.createCopilotPrompt);
      } else {
        const result = await apolloClient.mutate({
          mutation: UPDATE_PROMPT,
          variables: {
            id: template!.id,
            ...formData,
          },
        });
        onSave?.(result.data.updateCopilotPrompt);
      }
    } catch (error) {
      toast.error(`保存失败: ${error.message}`);
    }
  };

  return (
    <Dialog open>
      <DialogContent className="template-editor-dialog">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '创建模板' : '编辑模板'}
          </DialogTitle>
        </DialogHeader>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="messages">消息</TabsTrigger>
            <TabsTrigger value="variables">参数</TabsTrigger>
            <TabsTrigger value="config">配置</TabsTrigger>
          </TabsList>

          {/* 基本信息 */}
          <TabsContent value="basic">
            <div className="form-section">
              <div className="form-group">
                <label>模板名称</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：周工作汇报"
                />
              </div>

              <div className="form-group">
                <label>描述</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述模板的用途..."
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>分类</label>
                <CategorySelect
                  value={formData.category}
                  onChange={(category) => setFormData({ ...formData, category })}
                />
              </div>

              <div className="form-group">
                <label>AI 模型</label>
                <ModelSelect
                  value={formData.model}
                  onChange={(model) => setFormData({ ...formData, model })}
                />
              </div>

              <div className="form-group">
                <Checkbox
                  checked={formData.isPublic}
                  onChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                >
                  公开模板（所有工作区可用）
                </Checkbox>
              </div>
            </div>
          </TabsContent>

          {/* 消息编辑 */}
          <TabsContent value="messages">
            <MessagesEditor
              messages={formData.messages}
              onChange={(messages) => setFormData({ ...formData, messages })}
            />
          </TabsContent>

          {/* 参数编辑 */}
          <TabsContent value="variables">
            <VariablesEditor
              variables={formData.variables}
              onChange={(variables) => setFormData({ ...formData, variables })}
            />
          </TabsContent>

          {/* 配置 */}
          <TabsContent value="config">
            <ConfigEditor
              config={formData.config}
              onChange={(config) => setFormData({ ...formData, config })}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onCancel} variant="secondary">
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 实现方案

### 前端服务层

```typescript
// src/web/services/prompt-template.ts

export class PromptTemplateService {
  /**
   * 列出模板
   */
  async listPrompts(filters?: { category?: string; workspaceId?: string; isPublic?: boolean }): Promise<CopilotPrompt[]> {
    const response = await apolloClient.query({
      query: LIST_PROMPTS,
      variables: filters,
      fetchPolicy: 'network-only',
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.listCopilotPrompts;
  }

  /**
   * 获取模板详情
   */
  async getPrompt(id: string): Promise<CopilotPrompt> {
    const response = await apolloClient.query({
      query: GET_PROMPT,
      variables: { id },
      fetchPolicy: 'network-only',
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.copilotPrompt;
  }

  /**
   * 使用模板生成文档
   */
  async useTemplate(promptId: string, values: Record<string, any>): Promise<{ content: string; docId: string }> {
    const response = await apolloClient.mutate({
      mutation: GENERATE_DOC_FROM_PROMPT,
      variables: {
        promptId,
        values,
      },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    // 增加使用次数
    await apolloClient.mutate({
      mutation: INCREMENT_PROMPT_USAGE,
      variables: { id: promptId },
    });

    return response.data.generateDocFromPrompt;
  }

  /**
   * 收藏模板
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const response = await apolloClient.mutate({
      mutation: TOGGLE_FAVORITE_PROMPT,
      variables: { id },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.toggleFavoritePrompt.favorited;
  }
}

export const promptTemplateService = new PromptTemplateService();
```

### AI Chat 集成

```typescript
// 在 AI Chat 面板中添加模板入口
// src/web/components/ai-chat-panel.tsx (更新)

export const AIChatPanel: React.FC = () => {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="ai-chat-panel">
      {/* 头部 */}
      <div className="chat-header">
        <h2>AI Chat</h2>
        <Button
          onClick={() => setShowTemplates(true)}
          variant="secondary"
          icon="template"
        >
          模板库
        </Button>
      </div>

      {/* 模板库对话框 */}
      {showTemplates && (
        <PromptTemplateLibrary
          onUseTemplate={(template, values) => {
            setShowTemplates(false);
            // 使用模板生成
            handleUseTemplate(template, values);
          }}
        />
      )}

      {/* 消息列表 */}
      {/* ... */}
    </div>
  );
};
```

---

## API对接

### 集成 AFFiNE Copilot Prompt API

根据之前的验证，AFFiNE 已经提供了相关 mutation：

```graphql
# 创建 Prompt
mutation {
  createCopilotPrompt(input: {
    name: "周工作汇报"
    action: "chat"
    model: "gpt-3.5-turbo"
    messages: [...]
    ...
  }) {
    id
    name
  }
}

# 列出 Prompt
query {
  listCopilotPrompts {
    id
    name
    action
    model
    ...
  }
}
```

### 对接实现

```typescript
// 使用 AFFiNE 的 API
export const createCopilotPrompt = async (input: CreatePromptInput) => {
  const response = await apolloClient.mutate({
    mutation: gql`
      mutation CreateCopilotPrompt($input: CreateCopilotPromptInput!) {
        createCopilotPrompt(input: $input) {
          id
          name
          ...
        }
      }
    `,
    variables: { input },
  });

  return response.data.createCopilotPrompt;
};
```

---

## 实现优先级

### Phase 1: 核心功能（必须实现）

- [ ] 后端 Schema 定义
- [ ] 后端 CRUD API
- [ ] 前端模板库 UI
- [ ] 参数表单和验证
- [ ] 模板使用流程

### Phase 2: 增强功能（重要）

- [ ] 模板编辑器（管理员）
- [ ] 搜索和筛选
- [ ] 收藏功能
- [ ] 使用统计

### Phase 3: 优化功能（可选）

- [ ] 模板导入/导出
- [ ] 模板分享
- [ ] 模板市场（跨工作区）
- [ ] A/B 测试不同 Prompt

---

**文档版本**: 1.0
**最后更新**: 2025-01-16
**预计工时**: 后端 (4-5天), 前端 (3-4天), 联调 (1-2天)
