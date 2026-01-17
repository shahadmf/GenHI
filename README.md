# Plane Project Insight Chatbot

A modern, production-ready web application for analyzing Plane projects using AI-powered insights. Built with React, TypeScript, and Tailwind CSS.

## Features

**Context Selection** - Choose workspace and project  
**AI Chat Interface** - Conversational project insights  
**Markdown Support** - Rich formatted responses  
**Mock Mode** - Works without backend for testing  
**Persistent Storage** - Conversations saved in localStorage  
**Latest Insights Panel** - Collapsible sidebar with recent insights  
**Prompt Chips** - Quick access to common queries  
**Professional UI** - Modern, minimal design  

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd plane-insight-chatbot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will open at `http://localhost:3000`

### Environment Variables

Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:3001
```

If not set, defaults to `http://localhost:3001`.

## Usage

### Mock Mode (Default)

The app starts in mock mode, which uses fake data and doesn't require a backend. Perfect for:
- Testing the UI
- Demos
- Development without backend

Toggle mock mode on/off in the Context Selection screen.

### Production Mode

When mock mode is OFF, the app expects these API endpoints:

#### GET `/api/projects`

Returns list of projects:
```json
[
  {
    "id": "string",
    "name": "string", 
    "workspaceId": "string",
    "workspaceName": "string"
  }
]
```

#### POST `/api/chat`

Request body:
```json
{
  "workspaceId": "string",
  "projectId": "string",
  "conversationId": "string",
  "message": "string"
}
```

Response:
```json
{
  "conversationId": "string",
  "reply": "string (markdown supported)",
  "meta": {
    "confidence": 0.95,
    "generatedAt": "ISO timestamp"
  }
}
```

## Building for Production
```bash
# Build the app
npm run build

# Preview production build locally
npm run preview
```

The build output will be in the `dist/` directory.

## Deploying to AWS Amplify

### Option 1: Amplify Console (Recommended)

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"
   - Connect your Git repository (GitHub, GitLab, Bitbucket)

2. **Configure Build Settings**
   
   Amplify will auto-detect Vite. Use these settings:
```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
```

3. **Environment Variables**
   
   Add in Amplify Console → App Settings → Environment variables:
```
   VITE_API_BASE_URL=https://your-api-endpoint.com
```

4. **Deploy**
   - Click "Save and Deploy"
   - Amplify will build and deploy automatically
   - Future commits trigger auto-deployment

### Option 2: Amplify CLI
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify in your project
amplify init

# Add hosting
amplify add hosting

# Choose "Hosting with Amplify Console"
# Select "Manual deployment"

# Publish
amplify publish
```

### Custom Domain (Optional)

1. Go to Amplify Console → Domain Management
2. Add your custom domain
3. Follow DNS verification steps
4. Amplify handles SSL certificates automatically

## Project Structure
```
src/
  ├── main.tsx              # App entry point
  ├── App.tsx               # Main component
  ├── index.css             # Global styles
  └── components/           # Reusable components
```

## Features in Detail

### Conversation Persistence

- Conversations stored in `localStorage`
- Last selected project remembered
- Conversation history maintained per project

### Markdown Rendering

Assistant messages support:
- Headers (##, ###)
- Bold text (**text**)
- Lists (bullets)
- Line breaks and paragraphs

### Error Handling

- Graceful degradation when API fails
- Automatic fallback to mock mode (if enabled)
- User-friendly error messages

### Latest Insights Panel

- Shows last assistant response
- Collapsible sidebar
- Copy functionality
- Truncated preview with full content available

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.