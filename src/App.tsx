import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Trash2, Copy, Check, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

// Types
interface Project {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  meta?: {
    confidence?: number;
    generatedAt?: string;
  };
}

interface Conversation {
  id: string;
  projectId: string;
  messages: Message[];
}

// Mock Data
const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Mobile App Redesign', workspaceId: 'w1', workspaceName: 'Design Team' },
  { id: 'p2', name: 'API Gateway Migration', workspaceId: 'w1', workspaceName: 'Design Team' },
  { id: 'p3', name: 'Q1 Marketing Campaign', workspaceId: 'w2', workspaceName: 'Marketing' },
  { id: 'p4', name: 'Infrastructure Upgrade', workspaceId: 'w3', workspaceName: 'Engineering' },
];

const MOCK_RESPONSES = {
  'project summary': 'The **Mobile App Redesign** project is currently in the development phase with 67% completion. We have 12 active tasks, 8 completed, and 4 pending review. The team consists of 5 members working across UI/UX design, frontend development, and QA testing.\n\n### Key Metrics:\n- Sprint Progress: 67%\n- Tasks Completed: 8/12\n- Team Velocity: 23 story points/week\n- Estimated Completion: 2 weeks',
  'blockers': '### Current Blockers:\n\n1. **Design System Inconsistencies** - The component library has conflicting styles that need resolution before UI implementation.\n2. **API Response Delays** - Backend endpoints are experiencing latency issues affecting user testing.\n3. **Resource Allocation** - One frontend developer is split between two projects, causing delays in task completion.',
  'risks': '### Identified Risks:\n\n **High Priority:**\n- Timeline may slip by 1 week due to design system issues\n- Technical debt in legacy codebase could impact migration\n\n **Medium Priority:**\n- Third-party library dependency has known security vulnerabilities\n- Limited QA resources during final sprint\n\n **Low Priority:**\n- Minor documentation gaps in API specifications',
  'recommendations': '### Strategic Recommendations:\n\n1. **Immediate Actions:**\n   - Schedule design system alignment meeting this week\n   - Allocate dedicated frontend resource to unblock critical path\n   - Implement caching layer to mitigate API latency\n\n2. **Short-term Improvements:**\n   - Add automated testing coverage (currently at 45%)\n   - Create detailed rollback plan for production deployment\n\n3. **Long-term Considerations:**\n   - Invest in design system documentation\n   - Plan technical debt reduction sprint post-launch',
  'what changed since yesterday?': '### Changes in Last 24 Hours:\n\n **Completed:**\n- User authentication flow implementation\n- Mobile responsive design for dashboard\n- Unit tests for core components (12 new tests)\n\n **In Progress:**\n- Integration with payment gateway API\n- Performance optimization for image loading\n\n **New:**\n- Added accessibility audit to sprint backlog\n- New blocker identified: iOS build configuration issue',
  'default': 'I understand you\'re asking about the project. Let me provide you with relevant insights.\n\nBased on the current project state, here are the key points:\n\n- **Progress:** The project is moving forward with consistent velocity\n- **Team Health:** Team collaboration is strong with daily standups\n- **Next Steps:** Focus on completing the current sprint tasks\n\nIs there a specific aspect you\'d like me to dive deeper into?'
};

// Utility Functions
const generateId = () => Math.random().toString(36).substring(2, 15);

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getMockResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  for (const [key, response] of Object.entries(MOCK_RESPONSES)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }
  return MOCK_RESPONSES.default;
};

// Markdown Renderer Component
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderMarkdown = (text: string) => {
    let html = text;
    
    // Headers
    html = html.replace(/### (.*?)(\n|$)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/## (.*?)(\n|$)/g, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    
    // Lists
    html = html.replace(/^- (.*?)$/gm, '<li class="ml-4">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc ml-4 my-2">$1</ul>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="mb-3">');
    html = '<p class="mb-3">' + html + '</p>';
    
    return html;
  };

  return (
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};

// Main App Component
const GenHIChatbot: React.FC = () => {
  const [screen, setScreen] = useState<'context' | 'chat'>('context');
  const [mockMode, setMockMode] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insightsPanelOpen, setInsightsPanelOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = (typeof window !== 'undefined' && (window as any).ENV?.VITE_API_BASE_URL) || 'http://localhost:3001';

  // Load from localStorage
  useEffect(() => {
    const savedProjectId = localStorage.getItem('lastSelectedProject');
    const savedConversations = localStorage.getItem('conversations');
    
    if (savedConversations) {
      const conversations: Conversation[] = JSON.parse(savedConversations);
      if (savedProjectId) {
        const conv = conversations.find(c => c.projectId === savedProjectId);
        if (conv) setConversation(conv);
      }
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversation) {
      const saved = localStorage.getItem('conversations');
      const conversations: Conversation[] = saved ? JSON.parse(saved) : [];
      const index = conversations.findIndex(c => c.id === conversation.id);
      
      if (index >= 0) {
        conversations[index] = conversation;
      } else {
        conversations.push(conversation);
      }
      
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversation]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Fetch projects
  const fetchProjects = async () => {
    if (mockMode) {
      setProjects(MOCK_PROJECTS);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      if (mockMode) {
        setProjects(MOCK_PROJECTS);
      } else {
        setError('Failed to load projects. Enable mock mode to continue.');
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [mockMode]);

  // Workspaces
  const workspaces = Array.from(new Set(projects.map(p => p.workspaceName))).map((name, i) => ({
    id: projects.find(p => p.workspaceName === name)?.workspaceId || `w${i}`,
    name
  }));

  const filteredProjects = selectedWorkspace
    ? projects.filter(p => p.workspaceName === selectedWorkspace)
    : [];

  const handleOpenChat = () => {
    if (!selectedProject) return;
    
    localStorage.setItem('lastSelectedProject', selectedProject.id);
    
    const saved = localStorage.getItem('conversations');
    const conversations: Conversation[] = saved ? JSON.parse(saved) : [];
    const existing = conversations.find(c => c.projectId === selectedProject.id);
    
    if (existing) {
      setConversation(existing);
    } else {
      setConversation({
        id: generateId(),
        projectId: selectedProject.id,
        messages: []
      });
    }
    
    setScreen('chat');
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !selectedProject || !conversation) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };

    setConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage]
    } : null);

    setInput('');
    setLoading(true);
    setError(null);

    try {
      let responseContent: string;
      let meta = { confidence: 0.95, generatedAt: new Date().toISOString() };

      if (mockMode) {
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        responseContent = getMockResponse(messageText);
      } else {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: selectedProject.workspaceId,
            projectId: selectedProject.id,
            conversationId: conversation.id,
            message: messageText
          })
        });

        if (!response.ok) throw new Error('Failed to send message');
        
        const data = await response.json();
        responseContent = data.reply;
        meta = data.meta || meta;
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        meta
      };

      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage]
      } : null);
    } catch (err) {
      console.error('Error sending message:', err);
      
      if (mockMode) {
        const fallbackMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: getMockResponse(messageText),
          timestamp: new Date(),
          meta: { confidence: 0.95, generatedAt: new Date().toISOString() }
        };
        setConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, fallbackMessage]
        } : null);
      } else {
        setError('Failed to send message. Try enabling mock mode.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (conversation) {
      setConversation({
        ...conversation,
        messages: []
      });
    }
  };

  const handleRefresh = () => {
    fetchProjects();
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const promptChips = [
    'Project summary',
    'Blockers',
    'Risks',
    'Recommendations',
    'What changed since yesterday?'
  ];

  const lastAssistantMessage = conversation?.messages
    .filter(m => m.role === 'assistant')
    .slice(-1)[0];

  // Context Selection Screen
  if (screen === 'context') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="mb-6 flex flex-col items-center">
            <img 
              src="../logo.png" 
              alt="GenHI Logo" 
              className="h-16 mb-4"
            />
            <h1 className="text-3xl font-bold text-blue-900 mb-2">Plane Insights</h1>
            <p className="text-slate-600">Select a project to start analyzing</p>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Mock Mode</label>
            <button
              onClick={() => setMockMode(!mockMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mockMode ? 'bg-orange-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mockMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Workspace
              </label>
              <select
                value={selectedWorkspace}
                onChange={(e) => {
                  setSelectedWorkspace(e.target.value);
                  setSelectedProject(null);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select workspace...</option>
                {workspaces.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Project
              </label>
              <select
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  setSelectedProject(project || null);
                }}
                disabled={!selectedWorkspace}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">Select project...</option>
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenChat}
              disabled={!selectedProject}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Open Chat
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat Screen
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setScreen('context')}
            className="text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-slate-900">
            {selectedProject?.name}
          </h2>
          {mockMode && (
            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
              Mock Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col transition-all ${insightsPanelOpen ? 'mr-80' : ''}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {conversation?.messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Ask questions about your project or try a prompt below
                  </p>
                </div>
              </div>
            )}

            {conversation?.messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-slate-500'}`}>
                      {formatTime(new Date(message.timestamp))}
                    </span>
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(message.content, message.id)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Copy"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="mb-4 flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips */}
          {conversation?.messages.length === 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {promptChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Composer */}
          <div className="px-6 pb-6">
            <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask about your project..."
                rows={3}
                className="w-full px-4 py-3 resize-none focus:outline-none"
              />
              <div className="px-4 py-2 bg-slate-50 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Press Enter to send, Shift+Enter for new line
                </span>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Insights Panel */}
        <div
          className={`fixed right-0 top-0 h-full bg-white border-l border-slate-200 transition-transform ${
            insightsPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ width: '320px', marginTop: '73px' }}
        >
          <button
            onClick={() => setInsightsPanelOpen(!insightsPanelOpen)}
            className="absolute -left-10 top-4 bg-white border border-slate-200 p-2 rounded-l-lg hover:bg-slate-50"
          >
            {insightsPanelOpen ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>

          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Latest Insights</h3>
            {lastAssistantMessage ? (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-700 mb-2">
                  <MarkdownRenderer content={lastAssistantMessage.content.substring(0, 300) + '...'} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                  <span className="text-xs text-slate-500">
                    {formatTime(new Date(lastAssistantMessage.timestamp))}
                  </span>
                  <button
                    onClick={() => handleCopy(lastAssistantMessage.content, 'insight-' + lastAssistantMessage.id)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    {copiedId === 'insight-' + lastAssistantMessage.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No insights yet. Start a conversation to see insights here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenHIChatbot;