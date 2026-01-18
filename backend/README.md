# Plane Insight Backend Server

Backend API server that connects to Plane.so via MCP (Model Context Protocol) to provide project insights for the GenHI chatbot.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Plane.so account with API access
- Your workspace slug and API key

### Installation

1. **Clone or create the backend directory**
```bash
mkdir plane-insight-backend
cd plane-insight-backend
```

2. **Create all files**

Copy the following files into your directory:
- `server.js` (from artifact)
- `package.json`
- `.env.example`
- `.gitignore`
- This `README.md`

3. **Install dependencies**
```bash
npm install
```

4. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
PLANE_API_KEY=plane_xxxxxxxxxxxxx
PLANE_WORKSPACE_SLUG=genhi-team
PLANE_BASE_URL=https://api.plane.so
PORT=3001
```

### 🔑 Getting Your Plane Credentials

#### Method 1: From Your Plane Project Repository

Looking at your project: `https://github.com/AbdoQ/aws-manara-GenHI-team`

1. Check if there's a Plane configuration in the repo
2. Or go to your Plane workspace directly

#### Method 2: From Plane.so Dashboard

1. **Get API Key:**
   - Go to https://app.plane.so
   - Click your profile (bottom left)
   - Settings → API Tokens
   - Generate new token or copy existing

2. **Get Workspace Slug:**
   - Look at your Plane URL: `https://app.plane.so/[workspace-slug]/projects`
   - The workspace slug is in the URL path
   - Example: If URL is `https://app.plane.so/genhi-team/projects`, slug is `genhi-team`

#### Method 3: From GitHub Repository

If your team uses Plane integration:
1. Check `.github/workflows/` for Plane configs
2. Look for environment variables in repo settings
3. Check with team lead for shared credentials

### ▶️ Run the Server

**Development mode (auto-restart on changes):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║  🚀 Plane Insight Backend Server                          ║
║  📡 Server running on http://localhost:3001               ║
╚════════════════════════════════════════════════════════════╝

🔧 Configuration:
   Workspace: genhi-team
   Plane URL: https://api.plane.so
   API Key: ✅ SET

🔄 Initializing MCP Plane server...
✅ MCP Plane server connected successfully
📋 Available MCP tools: plane_list_projects, plane_get_project, ...

✅ Backend ready to accept requests!
```

### 🧪 Test the Server

**1. Health Check:**
```bash
curl http://localhost:3001/health
```

**2. List Projects:**
```bash
curl http://localhost:3001/api/projects
```

**3. Test Chat:**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "message": "Give me a project summary"
  }'
```

## 🔗 Connecting to Frontend

### Update Frontend .env

In your React app directory, update `.env`:
```env
VITE_API_BASE_URL=http://localhost:3001
```

### Disable Mock Mode

In your React app:
1. Start the app: `npm run dev`
2. On the login screen, toggle "Mock Mode" OFF
3. Select workspace and project
4. Start chatting!

## 📡 API Endpoints

### GET /health
Health check and MCP connection status

**Response:**
```json
{
  "status": "ok",
  "mcpConnected": true,
  "timestamp": "2025-01-18T..."
}
```

### GET /api/workspaces
List available workspaces

**Response:**
```json
[
  {
    "id": "genhi-team",
    "name": "genhi-team",
    "slug": "genhi-team"
  }
]
```

### GET /api/projects
List all projects in workspace

**Response:**
```json
[
  {
    "id": "proj_123",
    "name": "Mobile App",
    "workspaceId": "workspace_id",
    "workspaceName": "genhi-team",
    "description": "...",
    "identifier": "MOB"
  }
]
```

### GET /api/projects/:projectId
Get detailed project information

### GET /api/projects/:projectId/issues
List all issues for a project

### POST /api/chat
Send chat message and get AI insights

**Request:**
```json
{
  "projectId": "proj_123",
  "conversationId": "conv_456",
  "message": "What are the current blockers?"
}
```

**Response:**
```json
{
  "conversationId": "conv_456",
  "reply": "## Current Blockers\n\n...",
  "meta": {
    "confidence": 0.85,
    "generatedAt": "2025-01-18T...",
    "projectId": "proj_123",
    "contextUsed": true
  }
}
```

## 🏗️ Project Structure
```
plane-insight-backend/
├── server.js           # Main server file
├── package.json        # Dependencies
├── .env               # Environment variables (create from .env.example)
├── .env.example       # Example environment variables
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## 🔧 Troubleshooting

### "MCP server not available"

**Check:**
1. ✅ `PLANE_API_KEY` is set in `.env`
2. ✅ `PLANE_WORKSPACE_SLUG` is correct
3. ✅ API key has proper permissions
4. ✅ Network can reach Plane.so

**Fix:**
```bash
# Test API key manually
curl -H "x-api-key: YOUR_API_KEY" \
  https://api.plane.so/api/v1/workspaces/YOUR_SLUG/projects/
```

### "Failed to fetch projects"

**Check:**
1. Workspace slug is correct
2. You have access to the workspace
3. API key is not expired

### CORS Errors

The server has CORS enabled for all origins. If you need to restrict:
```javascript
// In server.js, replace:
app.use(cors());

// With:
app.use(cors({
  origin: 'http://localhost:3000'
}));
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3002
```

## 🚢 Deployment

### Option 1: AWS Amplify Backend

1. Create new backend in Amplify Console
2. Add environment variables
3. Deploy

### Option 2: Heroku
```bash
heroku create plane-insight-backend
heroku config:set PLANE_API_KEY=xxx
heroku config:set PLANE_WORKSPACE_SLUG=xxx
git push heroku main
```

### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

## 📝 Notes

- The server uses MCP to communicate with Plane.so
- All Plane data is fetched in real-time
- No database required - stateless design
- Supports multiple concurrent connections

## 🤝 Contributing

This is part of the GenHI AWS Manara project.
Repository: https://github.com/AbdoQ/aws-manara-GenHI-team

## 📄 License

MIT