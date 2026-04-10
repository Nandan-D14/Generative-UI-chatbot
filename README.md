[https://claude.ai/share/e1d5b52e-e4c6-4baa-81cf-216d9aa2336a]
# 🤖 AI Chatbot That Responds with User interfaces 

> **An AI-powered conversational system that transforms natural language queries into real-time, interactive dashboards — instead of static text responses.**

---

## 📌 Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [File Structure](#file-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Example Queries](#example-queries)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**QueryDash** is an AI-powered chatbot that goes beyond traditional text-based responses. When a user types a natural language query like:

> *"Show me monthly sales by region for Q3"*

Instead of replying with text, the system:
- Understands the query using an LLM + ReAct reasoning loop
- Fetches relevant data via MCP (Model Context Protocol)
- Dynamically generates an interactive dashboard with charts, filters, and drill-downs

No SQL. No dashboard configuration. No technical knowledge required.

---

## Problem Statement

Traditional data tools require users to know SQL, configure dashboards in Tableau or Power BI, or write scripts. Even modern AI chatbots return **static text answers**, forcing users to manually build charts and explore trends themselves.

There is no system that bridges **natural language understanding** with **real-time, interactive visual output** — leaving a critical gap between asking a question and truly understanding the answer.

---

## Solution

An end-to-end AI pipeline:

```
User Query (Chat)
      ↓
LLM + ReAct Reasoning
      ↓
LangChain Workflow Orchestration
      ↓
MCP Data Fetching Layer
      ↓
Dynamic UI / Dashboard Generator
      ↓
Interactive Dashboard Output
```

---

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        FRONTEND                          │
│           Chat Interface + Dashboard Renderer            │
│            (React + Recharts / Chart.js)                 │
└─────────────────────────┬────────────────────────────────┘
                          │ REST / WebSocket
┌─────────────────────────▼────────────────────────────────┐
│                    BACKEND LAYER                          │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  LLM Core   │  │ Prompt Engine│  │   LangChain    │  │
│  │ (ReAct loop)│→ │(Task struct.)│→ │  Orchestrator  │  │
│  └─────────────┘  └──────────────┘  └───────┬────────┘  │
│                                             │            │
│  ┌──────────────────────────────────────────▼──────────┐ │
│  │                   DATA LAYER (MCP)                  │ │
│  │  ┌───────────┐  ┌────────────┐  ┌───────────────┐  │ │
│  │  │MCP Server │  │   Query    │  │  Data Sources │  │ │
│  │  │           │  │  Planner   │  │ APIs/DB/Files │  │ │
│  │  └───────────┘  └────────────┘  └───────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                 UI GENERATION ENGINE                 │ │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │ │
│  │  │  Chart Gen │  │Layout Engine│  │Filter Engine │ │ │
│  │  │Bar/Line/Pie│  │ Tile layout │  │Date/Region.. │ │ │
│  │  └────────────┘  └─────────────┘  └──────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────┐
│               INTERACTIVE DASHBOARD OUTPUT                │
│          (Charts + Filters + Tables + Drill-down)         │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **LLM** | OpenAI GPT-4 / Claude (via API) |
| **Reasoning** | ReAct (Reason + Act) pattern |
| **Orchestration** | LangChain |
| **Data Protocol** | MCP (Model Context Protocol) |
| **Backend** | Python (FastAPI) |
| **Frontend** | React.js |
| **Charts** | Recharts / Chart.js |
| **Database** | PostgreSQL / MongoDB |
| **Caching** | Redis |
| **Auth** | JWT |
| **Containerization** | Docker + Docker Compose |

---

## File Structure

```
querydash/
│
├── README.md                          ← You are here
├── .env.example                       ← Environment variable template
├── .gitignore
├── docker-compose.yml                 ← Full stack orchestration
├── requirements.txt                   ← Python dependencies
├── package.json                       ← Node/frontend dependencies
│
├── backend/                           ← Python FastAPI backend
│   ├── main.py                        ← App entry point
│   ├── config.py                      ← Config loader
│   │
│   ├── api/                           ← API route handlers
│   │   ├── __init__.py
│   │   ├── chat.py                    ← /chat endpoint (main query handler)
│   │   ├── dashboard.py               ← /dashboard CRUD endpoints
│   │   └── auth.py                    ← /auth login/register
│   │
│   ├── core/                          ← Core AI pipeline
│   │   ├── __init__.py
│   │   ├── llm_agent.py               ← LLM + ReAct reasoning loop
│   │   ├── prompt_engine.py           ← Prompt templates + structuring
│   │   ├── langchain_orchestrator.py  ← LangChain workflow manager
│   │   └── react_loop.py              ← Reason → Act → Observe cycle
│   │
│   ├── mcp/                           ← MCP data layer
│   │   ├── __init__.py
│   │   ├── mcp_server.py              ← MCP server setup
│   │   ├── query_planner.py           ← Decides what/where to fetch
│   │   ├── connectors/
│   │   │   ├── sql_connector.py       ← SQL database connector
│   │   │   ├── rest_connector.py      ← REST API connector
│   │   │   ├── csv_connector.py       ← CSV / file connector
│   │   │   └── mongo_connector.py     ← MongoDB connector
│   │   └── schema_resolver.py        ← Auto-infers schema from query
│   │
│   ├── ui_generator/                  ← Dashboard generation engine
│   │   ├── __init__.py
│   │   ├── chart_generator.py         ← Bar, line, pie, scatter, etc.
│   │   ├── layout_engine.py           ← Tile layout builder
│   │   ├── filter_engine.py           ← Date, region, category filters
│   │   └── dashboard_schema.py        ← JSON schema for dashboard spec
│   │
│   ├── models/                        ← Pydantic data models
│   │   ├── chat.py
│   │   ├── dashboard.py
│   │   └── user.py
│   │
│   └── utils/
│       ├── logger.py
│       ├── cache.py                   ← Redis cache helpers
│       └── validators.py
│
├── frontend/                          ← React.js frontend
│   ├── public/
│   │   └── index.html
│   │
│   └── src/
│       ├── App.jsx
│       ├── index.jsx
│       │
│       ├── components/
│       │   ├── ChatInterface/
│       │   │   ├── ChatWindow.jsx     ← Main chat window
│       │   │   ├── MessageBubble.jsx  ← Chat message renderer
│       │   │   └── QueryInput.jsx     ← User input box
│       │   │
│       │   ├── Dashboard/
│       │   │   ├── DashboardFrame.jsx ← Main dashboard wrapper
│       │   │   ├── ChartTile.jsx      ← Individual chart tile
│       │   │   ├── FilterBar.jsx      ← Dashboard filter controls
│       │   │   └── TableView.jsx      ← Data table component
│       │   │
│       │   └── Charts/
│       │       ├── BarChart.jsx
│       │       ├── LineChart.jsx
│       │       ├── PieChart.jsx
│       │       └── ScatterChart.jsx
│       │
│       ├── hooks/
│       │   ├── useChat.js             ← Chat state management
│       │   └── useDashboard.js        ← Dashboard state management
│       │
│       ├── services/
│       │   ├── api.js                 ← Axios API client
│       │   └── websocket.js           ← Real-time WS handler
│       │
│       └── styles/
│           └── globals.css
│
├── prompts/                           ← Prompt templates (versioned)
│   ├── system_prompt.txt
│   ├── chart_selection_prompt.txt
│   ├── data_fetch_prompt.txt
│   └── layout_generation_prompt.txt
│
├── tests/
│   ├── backend/
│   │   ├── test_llm_agent.py
│   │   ├── test_mcp_connectors.py
│   │   └── test_ui_generator.py
│   └── frontend/
│       └── Dashboard.test.jsx
│
└── docs/
    ├── architecture.md
    ├── api_reference.md
    └── screenshots/
        └── demo.png
```

---

## Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- An OpenAI or Anthropic API key

---

### 1. Clone the repository

```bash
git clone https://github.com/Nandan-D14/querydash.git
cd querydash
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env and fill in your API keys (see below)
```

### 3. Run with Docker (recommended)

```bash
docker-compose up --build
```

App will be available at: `http://localhost:3000`

---

### Manual Setup (without Docker)

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# LLM
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
LLM_PROVIDER=openai                   # openai | anthropic

# Backend
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
SECRET_KEY=your_jwt_secret_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/querydash
MONGO_URL=mongodb://localhost:27017/querydash

# Redis
REDIS_URL=redis://localhost:6379

# MCP
MCP_SERVER_PORT=5050
MCP_DATA_SOURCE=postgres             # postgres | mongo | rest | csv

# Frontend
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

---

## How It Works

### Step-by-step pipeline

```
1. User types:  "Show Q3 sales by region as a bar chart"
        ↓
2. LLM parses intent:
   - Metric:    sales
   - Period:    Q3
   - Dimension: region
   - Chart:     bar
        ↓
3. ReAct loop decides:
   - Action: fetch_data(table=sales, filter=Q3, group_by=region)
        ↓
4. MCP fetches data from connected source (SQL / API / CSV)
        ↓
5. UI Generator produces dashboard JSON spec:
   {
     "type": "bar_chart",
     "title": "Q3 Sales by Region",
     "x_axis": "region",
     "y_axis": "sales",
     "filters": ["date_range", "region"],
     "data": [...]
   }
        ↓
6. Frontend renders interactive dashboard with:
   - Bar chart
   - Region filter dropdown
   - Date range picker
   - Drill-down on click
```

---

## API Reference

### `POST /chat`
Send a user query and receive a dashboard spec.

**Request:**
```json
{
  "message": "Show me monthly revenue for 2024",
  "session_id": "abc123"
}
```

**Response:**
```json
{
  "dashboard": {
    "type": "line_chart",
    "title": "Monthly Revenue 2024",
    "data": [...],
    "filters": ["month", "product_category"],
    "layout": "single"
  },
  "message": "Here is your monthly revenue for 2024."
}
```

---

### `GET /dashboard/{session_id}`
Retrieve a previously generated dashboard.

### `POST /dashboard/export`
Export dashboard as PNG or PDF.

---

## Example Queries

| Query | Output |
|-------|--------|
| `"Show Q3 sales by region"` | Bar chart with region filter |
| `"Compare revenue 2023 vs 2024"` | Grouped bar chart with year toggle |
| `"What products are selling the most this month?"` | Ranked table + pie chart |
| `"Show daily active users trend for last 30 days"` | Line chart with date filter |
| `"Break down expenses by category"` | Pie chart + table drill-down |

---

## Contributing

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow the existing code style and add tests for any new features.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

> Built with ❤️ using LLM + ReAct + LangChain + MCP
