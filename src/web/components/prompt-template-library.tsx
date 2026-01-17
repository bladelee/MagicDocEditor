/**
 * Prompt Template Library Component
 * Phase 1: Basic template library UI
 */

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import {
  promptTemplateService,
  type PromptTemplate,
} from '../services/prompt-template.js';

interface PromptTemplateLibraryProps {
  workspaceId?: string;
  onSelectTemplate?: (template: PromptTemplate) => void;
  onUseTemplate?: (
    template: PromptTemplate,
    values: Record<string, any>
  ) => void;
}

export const PromptTemplateLibrary: FC<PromptTemplateLibraryProps> = ({
  workspaceId,
  onSelectTemplate,
  onUseTemplate,
}) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [workspaceId]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await promptTemplateService.listPrompts(workspaceId);
      setTemplates(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    onSelectTemplate?.(template);
  };

  const handleUseTemplate = (template: PromptTemplate) => {
    // Phase 1: Use template without variables
    // In Phase 2, this would open a dialog to collect variable values
    onUseTemplate?.(template, {});
  };

  const filteredTemplates = templates.filter(
    t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description &&
        t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '14px' }}>
          📋 Prompt 模板库
        </div>
        <button
          onClick={loadTemplates}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: 'white',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          刷新
        </button>
      </div>

      {/* Search */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索模板..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d0d0d0',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>

      {/* Template List */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              color: '#999',
              marginTop: '40px',
            }}
          >
            加载中...
          </div>
        ) : error ? (
          <div
            style={{
              padding: '12px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
              fontSize: '13px',
            }}
          >
            ⚠️ 加载失败: {error.message}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#999',
              marginTop: '40px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <p style={{ margin: 0 }}>
              {searchQuery ? '没有找到匹配的模板' : '暂无模板'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '12px',
            }}
          >
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow =
                    '0 2px 8px rgba(102, 126, 234, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Template Name */}
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    marginBottom: '8px',
                    color: '#333',
                  }}
                >
                  {template.name}
                </div>

                {/* Template Description */}
                {template.description && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '12px',
                      lineHeight: '1.4',
                    }}
                  >
                    {template.description}
                  </div>
                )}

                {/* Template Metadata */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    fontSize: '11px',
                    color: '#999',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 6px',
                      background: '#f0f0f0',
                      borderRadius: '4px',
                    }}
                  >
                    {template.action}
                  </span>
                  {template.model && (
                    <span
                      style={{
                        padding: '2px 6px',
                        background: '#f0f0f0',
                        borderRadius: '4px',
                      }}
                    >
                      {template.model}
                    </span>
                  )}
                </div>

                {/* Use Button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleUseTemplate(template);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background:
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  使用模板
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {selectedTemplate && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e0e0e0',
            background: '#f9f9f9',
            fontSize: '12px',
            color: '#666',
          }}
        >
          已选择: {selectedTemplate.name}
        </div>
      )}
    </div>
  );
};
