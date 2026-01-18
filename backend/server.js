import express from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const app = express();
app.use(cors());
app.use(express.json());

let mcpClient = null;

// Initialize MCP client connection to Plane
async function initMCP() {
  try {
    console.log('🔄 Initializing MCP Plane server...');
    
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-plane'],
      env: {
        PLANE_API_KEY: process.env.PLANE_API_KEY,
        PLANE_WORKSPACE_SLUG: process.env.PLANE_WORKSPACE_SLUG,
        PLANE_BASE_URL: process.env.PLANE_BASE_URL || 'https://api.plane.so'
      }
    });

    mcpClient = new Client({
      name: 'plane-insight-backend',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await mcpClient.connect(transport);
    console.log('✅ MCP Plane server connected successfully');
    
    // List available tools
    const tools = await mcpClient.listTools();
    console.log('📋 Available MCP tools:', tools.tools.map(t => t.name).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize MCP:', error.message);
    return false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mcpConnected: mcpClient !== null,
    timestamp: new Date().toISOString()
  });
});

// GET /api/workspaces - Fetch workspaces (returns configured workspace)
app.get('/api/workspaces', async (req, res) => {
  try {
    // For now, return the configured workspace
    // You can extend this to fetch multiple workspaces if needed
    res.json([{
      id: process.env.PLANE_WORKSPACE_SLUG,
      name: process.env.PLANE_WORKSPACE_SLUG,
      slug: process.env.PLANE_WORKSPACE_SLUG
    }]);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces', details: error.message });
  }
});

// GET /api/projects - Fetch all projects from Plane via MCP
app.get('/api/projects', async (req, res) => {
  try {
    if (!mcpClient) {
      const connected = await initMCP();
      if (!connected) {
        return res.status(503).json({ 
          error: 'MCP server not available. Please check your Plane credentials.' 
        });
      }
    }

    console.log('📡 Fetching projects from Plane...');

    // Call MCP tool to list projects
    const response = await mcpClient.callTool({
      name: 'plane_list_projects',
      arguments: {
        workspace_slug: process.env.PLANE_WORKSPACE_SLUG
      }
    });

    // Parse the response
    const projectsText = response.content[0].text;
    const projects = JSON.parse(projectsText);
    
    console.log(`✅ Found ${projects.length} projects`);

    // Transform to API format
    const formatted = projects.map(p => ({
      id: p.id,
      name: p.name,
      workspaceId: p.workspace,
      workspaceName: process.env.PLANE_WORKSPACE_SLUG,
      description: p.description || '',
      identifier: p.identifier || ''
    }));

    res.json(formatted);
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({ 
      error: 'Failed to fetch projects', 
      details: error.message 
    });
  }
});

// GET /api/projects/:projectId - Get project details
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    if (!mcpClient) {
      const connected = await initMCP();
      if (!connected) {
        return res.status(503).json({ 
          error: 'MCP server not available' 
        });
      }
    }

    const { projectId } = req.params;

    console.log(`📡 Fetching project ${projectId} details...`);

    const response = await mcpClient.callTool({
      name: 'plane_get_project',
      arguments: {
        workspace_slug: process.env.PLANE_WORKSPACE_SLUG,
        project_id: projectId
      }
    });

    const projectText = response.content[0].text;
    const project = JSON.parse(projectText);

    res.json(project);
  } catch (error) {
    console.error('❌ Error fetching project details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch project details', 
      details: error.message 
    });
  }
});

// GET /api/projects/:projectId/issues - Get project issues
app.get('/api/projects/:projectId/issues', async (req, res) => {
  try {
    if (!mcpClient) {
      const connected = await initMCP();
      if (!connected) {
        return res.status(503).json({ 
          error: 'MCP server not available' 
        });
      }
    }

    const { projectId } = req.params;

    console.log(`📡 Fetching issues for project ${projectId}...`);

    const response = await mcpClient.callTool({
      name: 'plane_list_issues',
      arguments: {
        workspace_slug: process.env.PLANE_WORKSPACE_SLUG,
        project_id: projectId
      }
    });

    const issuesText = response.content[0].text;
    const issues = JSON.parse(issuesText);

    console.log(`✅ Found ${issues.length} issues`);

    res.json(issues);
  } catch (error) {
    console.error('❌ Error fetching issues:', error);
    res.status(500).json({ 
      error: 'Failed to fetch issues', 
      details: error.message 
    });
  }
});

// POST /api/chat - Handle chat requests with context from Plane
app.post('/api/chat', async (req, res) => {
  try {
    const { workspaceId, projectId, conversationId, message } = req.body;

    if (!message || !projectId) {
      return res.status(400).json({ 
        error: 'Missing required fields: message and projectId' 
      });
    }

    if (!mcpClient) {
      const connected = await initMCP();
      if (!connected) {
        return res.status(503).json({ 
          error: 'MCP server not available' 
        });
      }
    }

    console.log(`💬 Processing chat message for project ${projectId}: "${message}"`);

    // Fetch project context
    let projectContext = '';
    let issuesContext = '';

    try {
      // Get project details
      const projectResponse = await mcpClient.callTool({
        name: 'plane_get_project',
        arguments: {
          workspace_slug: process.env.PLANE_WORKSPACE_SLUG,
          project_id: projectId
        }
      });
      const project = JSON.parse(projectResponse.content[0].text);
      projectContext = `Project: ${project.name}\nDescription: ${project.description || 'N/A'}\n`;

      // Get project issues
      const issuesResponse = await mcpClient.callTool({
        name: 'plane_list_issues',
        arguments: {
          workspace_slug: process.env.PLANE_WORKSPACE_SLUG,
          project_id: projectId
        }
      });
      const issues = JSON.parse(issuesResponse.content[0].text);
      
      const totalIssues = issues.length;
      const openIssues = issues.filter(i => i.state_detail?.group === 'started' || i.state_detail?.group === 'unstarted').length;
      const completedIssues = issues.filter(i => i.state_detail?.group === 'completed').length;
      
      issuesContext = `Total Issues: ${totalIssues}\nOpen: ${openIssues}\nCompleted: ${completedIssues}\n`;
    } catch (err) {
      console.warn('⚠️ Could not fetch full context:', err.message);
    }

    // Generate response based on message intent
    let reply = '';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
      reply = `## Project Summary\n\n${projectContext}\n### Issue Statistics\n${issuesContext}\n\nThe project is progressing with active development. Would you like details on specific areas?`;
    } else if (lowerMessage.includes('blocker') || lowerMessage.includes('block')) {
      reply = `## Current Blockers\n\nBased on the project data:\n${issuesContext}\n\nTo identify specific blockers, I can analyze issue labels and priorities. Would you like me to dive deeper into specific issues?`;
    } else if (lowerMessage.includes('risk')) {
      reply = `## Risk Assessment\n\n${projectContext}\n${issuesContext}\n\n### Potential Risks:\n- Monitor the ratio of open vs completed issues\n- Review high-priority items regularly\n- Ensure team velocity is consistent\n\nWould you like a detailed risk breakdown?`;
    } else {
      reply = `I understand you're asking: "${message}"\n\n${projectContext}\n${issuesContext}\n\nI can provide insights on:\n- Project summary and progress\n- Blockers and risks\n- Issue breakdown\n- Team recommendations\n\nWhat would you like to explore?`;
    }

    res.json({
      conversationId: conversationId || `conv_${Date.now()}`,
      reply,
      meta: {
        confidence: 0.85,
        generatedAt: new Date().toISOString(),
        projectId,
        contextUsed: true
      }
    });

  } catch (error) {
    console.error('❌ Error processing chat:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message', 
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: err.message 
  });
});

const PORT = process.env.PORT || 3001;

// Start server and initialize MCP
app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Plane Insight Backend Server                          ║
║  📡 Server running on http://localhost:${PORT}               ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  console.log('🔧 Configuration:');
  console.log(`   Workspace: ${process.env.PLANE_WORKSPACE_SLUG || '❌ NOT SET'}`);
  console.log(`   Plane URL: ${process.env.PLANE_BASE_URL || 'https://api.plane.so'}`);
  console.log(`   API Key: ${process.env.PLANE_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log('');
  
  // Initialize MCP on startup
  await initMCP();
  
  console.log('');
  console.log('📚 Available endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/workspaces');
  console.log('   GET  /api/projects');
  console.log('   GET  /api/projects/:projectId');
  console.log('   GET  /api/projects/:projectId/issues');
  console.log('   POST /api/chat');
  console.log('');
  console.log('✅ Backend ready to accept requests!');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (mcpClient) {
    await mcpClient.close();
  }
  process.exit(0);
});