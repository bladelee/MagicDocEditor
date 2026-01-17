/**
 * Prompt Templates Page - Phase 1
 * Features:
 * - Browse all AI prompt templates
 * - Search and filter templates
 * - Use template to create AI chat
 * - Template library UI
 */
import type { FC } from 'react';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PromptTemplateLibrary } from '../components/prompt-template-library.js';
import { type PromptTemplate } from '../services/prompt-template.js';

export const PromptTemplatesPage: FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (
    template: PromptTemplate,
    values: Record<string, any>
  ) => {
    // Navigate to a new editor page with the template
    // Using current timestamp as a temporary page ID
    const pageId = `prompt-${Date.now()}`;
    navigate(`/workspace/${workspaceId}/${pageId}`, {
      state: {
        promptTemplate: template.name,
        promptValues: values,
      },
    });
  };

  return (
    <div
      style={{
        padding: '40px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }}>
          📋 AI Prompt 模板库
        </h1>
        <p style={{ margin: 0, color: '#666' }}>选择一个模板开始 AI 对话</p>
      </div>

      {/* Template Library */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <PromptTemplateLibrary
          workspaceId={workspaceId}
          onSelectTemplate={handleSelectTemplate}
          onUseTemplate={handleUseTemplate}
        />
      </div>

      {/* Template Info Panel */}
      {selectedTemplate && (
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fafafa',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>模板详情</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <strong>名称:</strong>
            <span>{selectedTemplate.name}</span>

            <strong>类型:</strong>
            <span style={{ textTransform: 'capitalize' }}>
              {selectedTemplate.action}
            </span>

            {selectedTemplate.model && (
              <>
                <strong>模型:</strong>
                <span>{selectedTemplate.model}</span>
              </>
            )}

            {selectedTemplate.description && (
              <>
                <strong>描述:</strong>
                <span>{selectedTemplate.description}</span>
              </>
            )}
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              onClick={() => handleUseTemplate(selectedTemplate, {})}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              使用此模板
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
