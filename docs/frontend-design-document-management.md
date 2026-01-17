# 文档管理功能前端设计文档

**功能模块**: 文档管理 (US-006)
**版本**: 1.0.0
**最后更新**: 2025-01-16

---

## 📋 目录

1. [功能需求](#功能需求)
2. [当前实现状态](#当前实现状态)
3. [缺失功能设计](#缺失功能设计)
4. [技术实现方案](#技术实现方案)
5. [API对接](#api对接)
6. [用户体验优化](#用户体验优化)

---

## 功能需求

### US-006: 文档创建/重命名/删除/移动

**验收准则**:

1. ❌ **点击「新建文档」可生成空白文档，默认标题为"Untitled Document"**
2. ❌ **文档标题支持双击修改，重命名后实时同步至云端**
3. ❌ **支持单个/批量删除文档，删除前弹出确认提示，删除后移入"回收站"**
4. ❌ **支持创建多个工作区，文档可跨工作区移动**
5. ❌ **文档列表展示标题、创建时间、最后修改时间**
6. ❌ **支持按"修改时间"升序/降序排序**
7. ❌ **支持搜索文档（按标题关键词）**

---

## 当前实现状态

### ✅ 已实现

| 功能     | 实现位置                         | 状态           |
| -------- | -------------------------------- | -------------- |
| 路由配置 | `routes/index.ts`                | 完整的路由结构 |
| 页面框架 | `workspace.tsx`, `all-pages.tsx` | 基础布局       |
| 类型定义 | `shared/types/document.ts`       | 完整的类型     |

### ❌ 完全缺失

| 功能           | 优先级 | 影响范围   |
| -------------- | ------ | ---------- |
| **创建文档**   | 🔴 高  | 核心功能   |
| **重命名文档** | 🔴 高  | 核心功能   |
| **删除文档**   | 🔴 高  | 核心功能   |
| **文档列表**   | 🔴 高  | 核心功能   |
| **搜索功能**   | 🔴 高  | 用户便利性 |
| **排序功能**   | 🟡 中  | 用户便利性 |
| **移动文档**   | 🟡 中  | 组织管理   |
| **批量操作**   | 🟢 低  | 效率提升   |

---

## 缺失功能设计

### 1. 创建文档功能

#### 设计方案

**新建文档对话框**:

```typescript
// src/web/components/create-doc-dialog.tsx

interface CreateDocDialogProps {
  workspaceId: string;
  onSuccess?: (doc: Doc) => void;
  onCancel?: () => void;
}

export const CreateDocDialog: React.FC<CreateDocDialogProps> = ({
  workspaceId,
  onSuccess,
  onCancel,
}) => {
  const [title, setTitle] = useState('Untitled Document');
  const [template, setTemplate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('请输入文档标题');
      return;
    }

    setIsCreating(true);
    try {
      const doc = await documentService.createDoc(workspaceId, title);

      if (template) {
        // 应用模板
        await documentService.updateDoc(doc.id, {
          content: template,
        });
      }

      toast.success('文档创建成功');
      onSuccess?.(doc);
    } catch (error) {
      toast.error(`创建失败: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建文档</DialogTitle>
        </DialogHeader>

        <div className="create-doc-form">
          {/* 标题输入 */}
          <div className="form-group">
            <label>文档标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入文档标题"
              autoFocus
              maxLength={100}
            />
          </div>

          {/* 模板选择 */}
          <div className="form-group">
            <label>选择模板（可选）</label>
            <TemplateSelector
              value={template}
              onChange={setTemplate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onCancel} variant="secondary">
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !title.trim()}
          >
            {isCreating ? '创建中...' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

**快捷创建按钮**:

```typescript
// src/web/components/quick-create-button.tsx

export const QuickCreateButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const workspaceId = useCurrentWorkspaceId();

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="primary"
        icon="plus"
      >
        新建文档
      </Button>

      {isOpen && (
        <CreateDocDialog
          workspaceId={workspaceId}
          onSuccess={(doc) => {
            setIsOpen(false);
            // 跳转到编辑器
            navigate(`/workspace/${workspaceId}/${doc.id}`);
          }}
          onCancel={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
```

### 2. 重命名文档功能

#### 设计方案

**文档标题组件（支持双击编辑）**:

```typescript
// src/web/components/doc-title.tsx

interface DocTitleProps {
  doc: Doc;
  onUpdate?: (newTitle: string) => void;
}

export const DocTitle: React.FC<DocTitleProps> = ({ doc, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 双击进入编辑模式
  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  // 保存标题
  const saveTitle = async () => {
    if (!title.trim() || title === doc.title) {
      setIsEditing(false);
      setTitle(doc.title);
      return;
    }

    setIsSaving(true);
    try {
      await documentService.updateDoc(doc.id, { title });
      toast.success('标题已更新');
      onUpdate?.(title);
      setIsEditing(false);
    } catch (error) {
      toast.error(`更新失败: ${error.message}`);
      setTitle(doc.title);
    } finally {
      setIsSaving(false);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setIsEditing(false);
    setTitle(doc.title);
  };

  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className="doc-title-container">
      {isEditing ? (
        <div className="title-edit">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveTitle}
            disabled={isSaving}
            maxLength={100}
            className="title-input"
          />
          {isSaving && <Spinner className="saving-indicator" />}
        </div>
      ) : (
        <h1
          className="doc-title"
          onDoubleClick={handleDoubleClick}
          title="双击编辑标题"
        >
          {title}
          <EditIcon className="edit-hint" />
        </h1>
      )}
    </div>
  );
};
```

### 3. 删除文档功能

#### 设计方案

**删除确认对话框**:

```typescript
// src/web/components/delete-doc-dialog.tsx

interface DeleteDocDialogProps {
  docs: Doc[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DeleteDocDialog: React.FC<DeleteDocDialogProps> = ({
  docs,
  onSuccess,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 批量删除
      await Promise.all(
        docs.map(doc => documentService.deleteDoc(doc.id))
      );

      toast.success(
        docs.length === 1
          ? '文档已移至回收站'
          : `已移至回收站 ${docs.length} 个文档`
      );

      onSuccess?.();
    } catch (error) {
      toast.error(`删除失败: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const docCount = docs.length;
  const isBatch = docCount > 1;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isBatch ? `删除 ${docCount} 个文档` : '删除文档'}
          </DialogTitle>
        </DialogHeader>

        <div className="delete-confirmation">
          <AlertIcon className="alert-icon" />
          <p>
            {isBatch
              ? `确定要删除这 ${docCount} 个文档吗？文档将移至回收站，7天后永久删除。`
              : '确定要删除此文档吗？文档将移至回收站，7天后永久删除。'}
          </p>

          {/* 文档列表 */}
          {isBatch && (
            <div className="doc-list">
              {docs.map(doc => (
                <div key={doc.id} className="doc-item">
                  <FileIcon />
                  <span>{doc.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onCancel} variant="secondary">
            取消
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

**文档卡片操作菜单**:

```typescript
// src/web/components/doc-card-menu.tsx

interface DocCardMenuProps {
  doc: Doc;
  onDelete?: () => void;
  onRename?: () => void;
  onMove?: () => void;
}

export const DocCardMenu: React.FC<DocCardMenuProps> = ({
  doc,
  onDelete,
  onRename,
  onMove,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton>
          <MoreIcon />
        </IconButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem onClick={onRename}>
          <EditIcon />
          重命名
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onMove}>
          <FolderIcon />
          移动到...
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="delete-option"
        >
          <TrashIcon />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### 4. 文档列表功能

#### 设计方案

**文档列表组件**:

```typescript
// src/web/components/doc-list.tsx

interface DocListProps {
  workspaceId: string;
  onDocSelect?: (doc: Doc) => void;
}

export const DocList: React.FC<DocListProps> = ({
  workspaceId,
  onDocSelect,
}) => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // 加载文档列表
  useEffect(() => {
    loadDocs();
  }, [workspaceId, sortBy, sortOrder]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const allDocs = await documentService.listDocs(workspaceId);

      // 排序
      const sorted = [...allDocs].sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        const order = sortOrder === 'asc' ? 1 : -1;
        return aValue > bValue ? order : -order;
      });

      setDocs(sorted);
    } catch (error) {
      toast.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索功能
  const [searchQuery, setSearchQuery] = useState('');
  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 批量选择
  const toggleSelect = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
    }
  };

  // 批量删除
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const handleBatchDelete = () => {
    if (selectedDocs.size === 0) return;
    setShowDeleteDialog(true);
  };

  return (
    <div className="doc-list-container">
      {/* 工具栏 */}
      <div className="doc-list-toolbar">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="搜索文档..."
        />

        <SortSelector
          value={sortBy}
          order={sortOrder}
          onSortChange={setSortBy}
          onOrderChange={setSortOrder}
        />

        <QuickCreateButton />

        {selectedDocs.size > 0 && (
          <Button
            onClick={handleBatchDelete}
            variant="destructive"
          >
            删除 ({selectedDocs.size})
          </Button>
        )}
      </div>

      {/* 文档列表 */}
      {loading ? (
        <Spinner />
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon="document"
          message={searchQuery ? '没有找到匹配的文档' : '暂无文档'}
        />
      ) : (
        <>
          {/* 批量选择模式 */}
          {selectedDocs.size > 0 && (
            <div className="bulk-actions">
              <Checkbox
                checked={selectedDocs.size === filteredDocs.length}
                onChange={toggleSelectAll}
              />
              <span>已选择 {selectedDocs.size} 个文档</span>
            </div>
          )}

          {/* 文档卡片 */}
          <div className="doc-cards">
            {filteredDocs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                selected={selectedDocs.has(doc.id)}
                onSelect={() => toggleSelect(doc.id)}
                onClick={() => onDocSelect?.(doc)}
              />
            ))}
          </div>
        </>
      )}

      {/* 删除对话框 */}
      {showDeleteDialog && (
        <DeleteDocDialog
          docs={filteredDocs.filter(d => selectedDocs.has(d.id))}
          onSuccess={() => {
            setShowDeleteDialog(false);
            setSelectedDocs(new Set());
            loadDocs();
          }}
          onCancel={() => {
            setShowDeleteDialog(false);
          }}
        />
      )}
    </div>
  );
};
```

**文档卡片组件**:

```typescript
// src/web/components/doc-card.tsx

interface DocCardProps {
  doc: Doc;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
}

export const DocCard: React.FC<DocCardProps> = ({
  doc,
  selected,
  onSelect,
  onClick,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`doc-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* 复选框（批量选择模式） */}
      {onSelect && (
        <Checkbox
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="doc-checkbox"
        />
      )}

      {/* 文档图标 */}
      <div className="doc-icon">
        <FileIcon />
      </div>

      {/* 文档信息 */}
      <div className="doc-info">
        <h3 className="doc-title">{doc.title}</h3>
        <div className="doc-meta">
          <span>修改于 {formatDate(doc.updatedAt)}</span>
          <span>•</span>
          <span>创建于 {formatDate(doc.createdAt)}</span>
        </div>
      </div>

      {/* 操作菜单 */}
      <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="doc-menu-trigger"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreIcon />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => {/* 重命名 */}}>
            <EditIcon /> 重命名
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {/* 移动 */}}>
            <FolderIcon /> 移动到...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {/* 删除 */}
          }
            className="delete-option"
          >
            <TrashIcon /> 删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
```

### 5. 搜索功能

#### 设计方案

**搜索输入组件**:

```typescript
// src/web/components/doc-search.tsx

interface DocSearchProps {
  onResults?: (docs: Doc[]) => void;
}

export const DocSearch: React.FC<DocSearchProps> = ({ onResults }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Doc[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const workspaceId = useCurrentWorkspaceId();

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms防抖

    return () => clearTimeout(timer);
  }, [query]);

  // 执行搜索
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      try {
        // 调用后端搜索API（如果有）或本地过滤
        const allDocs = await documentService.listDocs(workspaceId);
        const filtered = allDocs.filter(doc =>
          doc.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          doc.content.toLowerCase().includes(debouncedQuery.toLowerCase())
        );

        // 按匹配度排序
        const sorted = filtered.sort((a, b) => {
          const aScore = calculateRelevance(a, debouncedQuery);
          const bScore = calculateRelevance(b, debouncedQuery);
          return bScore - aScore;
        });

        setResults(sorted.slice(0, 20)); // 最多显示20个结果
        onResults?.(sorted.slice(0, 20));
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedQuery, workspaceId, onResults]);

  // 计算相关性分数
  const calculateRelevance = (doc: Doc, query: string): number => {
    const q = query.toLowerCase();
    const title = doc.title.toLowerCase();
    const content = doc.content.toLowerCase();

    let score = 0;

    // 标题完全匹配
    if (title === q) score += 100;
    // 标题包含
    else if (title.includes(q)) score += 50;
    // 标题部分匹配
    else if (fuzzyMatch(title, q)) score += 25;

    // 内容包含（降低权重）
    if (content.includes(q)) score += 10;

    return score;
  };

  // 简单的模糊匹配
  const fuzzyMatch = (text: string, query: string): boolean => {
    const chars = query.split('');
    let index = -1;
    for (const char of chars) {
      index = text.indexOf(char, index + 1);
      if (index === -1) return false;
    }
    return true;
  };

  return (
    <div className="doc-search">
      <div className="search-input-wrapper">
        <SearchIcon className="search-icon" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文档..."
          className="search-input"
        />
        {query && (
          <IconButton
            onClick={() => setQuery('')}
            className="clear-btn"
          >
            <CloseIcon />
          </IconButton>
        )}
      </div>

      {/* 搜索结果下拉 */}
      {query && (
        <div className="search-results">
          {isSearching ? (
            <div className="search-loading">
              <Spinner /> 搜索中...
            </div>
          ) : results.length === 0 ? (
            <div className="search-empty">
              没有找到匹配的文档
            </div>
          ) : (
            results.map((doc) => (
              <div
                key={doc.id}
                className="search-result-item"
                onClick={() => {
                  navigate(`/workspace/${workspaceId}/${doc.id}`);
                  setQuery('');
                }}
              >
                <FileIcon />
                <div className="result-info">
                  <div className="result-title">{doc.title}</div>
                  <div className="result-preview">
                    {doc.content.slice(0, 100)}...
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
```

### 6. 移动文档功能

#### 设计方案

**移动对话框**:

```typescript
// src/web/components/move-doc-dialog.tsx

interface MoveDocDialogProps {
  docs: Doc[];
  currentWorkspaceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MoveDocDialog: React.FC<MoveDocDialogProps> = ({
  docs,
  currentWorkspaceId,
  onSuccess,
  onCancel,
}) => {
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const all = await workspaceService.listWorkspaces();
      // 排除当前工作区
      setWorkspaces(all.filter(w => w.id !== currentWorkspaceId));
    } catch (error) {
      toast.error('加载工作区失败');
    }
  };

  const handleMove = async () => {
    if (!targetWorkspaceId) {
      toast.error('请选择目标工作区');
      return;
    }

    setIsMoving(true);
    try {
      await Promise.all(
        docs.map(doc => documentService.moveDoc(doc.id, targetWorkspaceId))
      );

      toast.success(
        docs.length === 1
          ? '文档已移动'
          : `已移动 ${docs.length} 个文档`
      );

      onSuccess?.();
    } catch (error) {
      toast.error(`移动失败: ${error.message}`);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            移动到工作区
            {docs.length === 1 ? `: ${docs[0].title}` : ` (${docs.length} 个文档)`}
          </DialogTitle>
        </DialogHeader>

        <div className="move-doc-form">
          <div className="form-group">
            <label>选择目标工作区</label>
            <Select value={targetWorkspaceId} onChange={setTargetWorkspaceId}>
              <option value="">请选择...</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onCancel} variant="secondary">
            取消
          </Button>
          <Button
            onClick={handleMove}
            disabled={isMoving || !targetWorkspaceId}
          >
            {isMoving ? '移动中...' : '确认移动'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 技术实现方案

### API 对接

```typescript
// src/web/services/document.ts (更新版)

export class DocumentService {
  // ... 现有方法

  // 创建文档
  async createDoc(workspaceId: string, title: string): Promise<Doc> {
    const response = await apolloClient.mutate({
      mutation: CREATE_DOC_MUTATION,
      variables: { workspaceId, title },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.createDoc;
  }

  // 更新文档标题
  async updateDocTitle(docId: string, title: string): Promise<Doc> {
    return this.updateDoc(docId, { title });
  }

  // 删除文档（软删除，移至回收站）
  async deleteDoc(docId: string): Promise<boolean> {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation MoveToTrash($id: ID!) {
          moveToTrash(id: $id)
        }
      `,
      variables: { id: docId },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.moveToTrash;
  }

  // 永久删除
  async permanentDelete(docId: string): Promise<boolean> {
    const response = await apolloClient.mutate({
      mutation: DELETE_DOC_MUTATION,
      variables: { id: docId },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.deleteDoc;
  }

  // 移动文档到其他工作区
  async moveDoc(docId: string, targetWorkspaceId: string): Promise<Doc> {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation MoveDoc($id: ID!, $targetWorkspaceId: ID!) {
          moveDoc(id: $id, targetWorkspaceId: $targetWorkspaceId) {
            id
            workspace {
              id
              name
            }
          }
        }
      `,
      variables: {
        id: docId,
        targetWorkspaceId,
      },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.moveDoc;
  }

  // 搜索文档
  async searchDocs(workspaceId: string, query: string): Promise<Doc[]> {
    const response = await apolloClient.query({
      query: gql`
        query SearchDocs($workspaceId: ID!, $query: String!) {
          searchDocs(workspaceId: $workspaceId, query: $query) {
            id
            title
            content
            createdAt
            updatedAt
          }
        }
      `,
      variables: { workspaceId, query },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.searchDocs;
  }
}
```

### 状态管理

```typescript
// src/web/contexts/docs-context.tsx

interface DocsContextValue {
  docs: Doc[];
  loading: boolean;
  createDoc: (title: string) => Promise<Doc>;
  updateDoc: (id: string, updates: Partial<Doc>) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  moveDoc: (id: string, targetWorkspaceId: string) => Promise<void>;
  searchDocs: (query: string) => Promise<Doc[]>;
}

export const DocsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const workspaceId = useCurrentWorkspaceId();

  // 加载文档列表
  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const allDocs = await documentService.listDocs(workspaceId);
      setDocs(allDocs);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // 创建文档
  const createDoc = useCallback(async (title: string) => {
    const newDoc = await documentService.createDoc(workspaceId, title);
    setDocs(prev => [...prev, newDoc]);
    return newDoc;
  }, [workspaceId]);

  // 删除文档
  const deleteDoc = useCallback(async (id: string) => {
    await documentService.deleteDoc(id);
    setDocs(prev => prev.filter(d => d.id !== id));
  }, []);

  // 移动文档
  const moveDoc = useCallback(async (id: string, targetWorkspaceId: string) => {
    const updated = await documentService.moveDoc(id, targetWorkspaceId);
    setDocs(prev => prev.filter(d => d.id !== id)); // 从当前列表移除
  }, []);

  // 搜索文档
  const searchDocs = useCallback(async (query: string) => {
    return await documentService.searchDocs(workspaceId, query);
  }, [workspaceId]);

  return (
    <DocsContext.Provider
      value={{
        docs,
        loading,
        createDoc,
        updateDoc: (id, updates) => {/*...*/},
        deleteDoc,
        moveDoc,
        searchDocs,
      }}
    >
      {children}
    </DocsContext.Provider>
  );
};
```

---

## 用户体验优化

### 加载状态

```typescript
// 骨架屏加载
export const DocListSkeleton: React.FC = () => (
  <div className="doc-list-skeleton">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <Skeleton variant="rect" width={40} height={40} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    ))}
  </div>
);
```

### 空状态

```typescript
// 空状态组件
export const EmptyDocList: React.FC = () => (
  <div className="empty-doc-list">
    <EmptyIcon />
    <h3>还没有文档</h3>
    <p>点击"新建文档"开始创建你的第一个文档</p>
    <QuickCreateButton />
  </div>
);
```

### 错误处理

```typescript
// 错误边界
class DocListErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <AlertIcon />
          <h3>加载文档列表失败</h3>
          <p>请刷新页面重试</p>
          <Button onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 实现优先级

### Phase 1: 核心功能（必须实现）

- [ ] 创建文档
- [ ] 重命名文档
- [ ] 删除文档
- [ ] 文档列表展示

### Phase 2: 增强功能（重要）

- [ ] 搜索功能
- [ ] 排序功能
- [ ] 批量操作
- [ ] 移动文档

### Phase 3: 优化功能（可选）

- [ ] 拖拽排序
- [ ] 标签系统
- [ ] 收藏功能
- [ ] 快捷键支持

---

**文档版本**: 1.0
**最后更新**: 2025-01-16
**预计工时**: Phase 1 (3-4天), Phase 2 (2-3天), Phase 3 (2-3天)
