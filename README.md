<div align="center">

# 💰 Smart Fund Assistant Pro
### 基于 HelloAgents 的新一代智能基金投顾系统

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Framework](https://img.shields.io/badge/Powered_by-HelloAgents-orange.svg?style=flat-square)](https://github.com/GoogleDeepMind/HelloAgents)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

[项目简介](#-项目简介) • [核心架构](#-核心架构) • [技术全景](#%EF%B8%8F-技术全景) • [项目结构](#-项目结构) • [快速开始](#-快速开始)

---

<p align="center">
  <strong>8 位专业 AI 智能体协同工作 ｜ 深度集成 HelloAgents 框架 ｜ 企业级 RAG 知识库</strong>
</p>

</div>

---

## 📖 项目简介

**Smart Fund Assistant Pro** 是一个深度实**HelloAgents Framework** 的参考级应用。

利用 HelloAgents 提供的多种 Agent 编排模式（ReAct, Plan-and-Solve, Reflection 等），构建了一个由 **8 个专业虚拟专家** 组成的金融投顾团队。该项目不仅展示了 LLM 在垂直领域的应用潜力，更是一套可用于生产环境的现代全栈解决方案。

---

## 🧠 核心架构 (Powered by HelloAgents)

本系统完全基于 **HelloAgents Framework** 构建，通过 orchestrator (协调者) 模式调度不同的专业 Agent：

| Agent 角色 | 采用范式 (Paradigm) | 技术实现细节 |
| :--- | :--- | :--- |
| **👩‍💼 总协调员** | `ReActAgent` | 作为系统大脑，负责意图路由。基于 HelloAgents 的 `ToolRegistry` 动态加载工具，实现精准的任务分发。 |
| **🎩 首席策略师** | `Chain-of-Thought` | 集成 `Persona` (人格) 模块，支持"激进/稳健"风格切换。利用 CoT 思维链推导宏观配置策略。 |
| **📈 技术分析师** | `ReflectionAgent` | 引入**自我反思**机制。在生成市场分析报告后，会自动进行 Critic (审查) 循环，修正幻觉与逻辑漏洞。 |
| **🧮 量化专家** | `CodeInterpreter` | 内置 Python 沙箱环境。不仅能聊天，更能实时编写并执行 Pandas/Numpy 代码，计算真实的夏普比率与 最大回撤。 |
| **🕵️ 市场侦察兵** | `GraphRAG` | 结合知识图谱与搜索增强。自动构建"供应链-竞争对手"关系网，从新闻中挖掘深层影响。 |
| **📝 投资顾问** | `PlanAndSolve` | 擅长长链条任务规划。将用户的模糊目标（如"3年存够首付"）拆解为多阶段的可执行理财计划。 |

---

## 🛠️ 技术全景

### 🐍 后端 (Backend) & AI
*   **基础框架**: `FastAPI` (高性能异步 Web 框架)
*   **AI 核心**: `HelloAgents Framework` (Agent 编排、记忆管理、工具调用)
*   **大模型支持**: 兼容 OpenAI 接口协议 (DeepSeek-V3, Qwen2.5, GPT-4o)
*   **向量检索**: `Qdrant` (本地/云端向量数据库，用于 RAG)
*   **数据存储**: `SQLite` (轻量级业务数据), `Redis` (可选，用于分布式缓存)
*   **金融数据**: `AkShare` (开源财经数据源), `TuShare` (专业数据源)

### ⚛️ 前端 (Frontend)
*   **核心框架**: `React 19` + `TypeScript` + `Vite`
*   **状态管理**: `Zustand` (轻量级全局状态), `React Query` (服务端状态同步)
*   **UI 系统**: `TailwindCSS` (原子化 CSS), `Framer Motion` (专业级动效)
*   **数据可视化**: `Lightweight Charts` (TradingView 同款 K 线), `Recharts` (统计图表)
*   **网络通信**: `Axios` (HTTP), `WebSocket` (实时流式对话)

---

## 📂 项目结构

```bash
fund_assistant/
├── agents/                     # 🤖 Agent 定义层 (HelloAgents 实现)
│   ├── advisor.py              # 投资顾问 (PlanAndSolve 模式)
│   ├── analyst.py              # 技术分析师 (Reflection 模式)
│   ├── coordinator.py          # 总协调员 (ReAct 模式)
│   ├── quant.py                # 量化专家 (代码解释器集成)
│   ├── strategist.py           # 首席策略师 (CoT + Persona)
│   └── ...
│
├── hello_agents/               # 🧠 HelloAgents 框架核心源码
│   ├── core/                   # 核心基类 (Agent, LLM, Memory)
│   ├── protocols/              # 通信协议 (A2A, MCP)
│   └── memory/                 # 记忆与 RAG 实现
│
├── api/                        # 🔌 接口层 (FastAPI Routers)
│   ├── chart_api.py            # 图表数据接口
│   ├── portfolio_api.py        # 持仓管理接口
│   └── ...
│
├── services/                   # ⚙️ 业务服务层
│   ├── discovery_service.py    # 基金筛选与发现逻辑
│   ├── investment_service.py   # 投资分析算法
│   └── ...
│
├── tools/                      # 🛠️ 工具箱 (供 Agent 调用)
│   ├── code_interpreter.py     # Python 代码执行沙箱
│   ├── market_data.py          # 行情数据获取 (AkShare)
│   └── fund_tools.py           # 基金基础信息查询
│
├── knowledge/                  # 📚 知识库 (RAG 数据源)
│   └── *.md/*.pdf              # 放入此处的文档会被自动索引
│
├── data/                       # 💾 数据存储
│   ├── fund_app.db             # SQLite 业务数据库
│   └── qdrant_storage/         # 向量数据库文件
│
├── frontend-pro/               # ⚛️ 前端工程 (React)
│   ├── src/
│   │   ├── components/         # 业务组件 (Chat, Charts, Dashboard)
│   │   ├── api/                # 前端 API 封装
│   │   ├── store/              # Zustand 状态管理
│   │   └── types/              # TypeScript 类型定义
│   └── ...
│
├── server.py                   # 🚀 程序启动入口
├── Dockerfile                  # 🐳 容器化构建文件
└── requirements.txt            # Python 依赖清单
```

---

## 🚀 快速开始

### 1. 环境准备
```bash
git clone https://github.com/pukueh/fund-assistant.git
cd fund-assistant
```

### 2. 配置密钥
复制配置文件并填入您的 LLM API Key (支持 DeepSeek, OpenAI 等)：
```bash
cp .env.example .env
vim .env
```
```env
LLM_API_KEY=sk-xxxxxxxxxxxx
LLM_BASE_URL=https://api.deepseek.com/v1
```

### 3. 启动服务 (Docker 推荐)
无需配置环境，一键拉起所有服务：
```bash
docker-compose up -d --build
```
访问 `http://localhost:8080` 即可体验。

### 4. 本地开发模式
如果是进行二次开发，建议手动启动：

**后端:**
```bash
pip install -r requirements.txt
python server.py
# 服务运行在 :8080
```

**前端:**
```bash
cd frontend-pro
npm install
npm run dev
# 开发服务运行在 :3000
```

---

## 🤝 贡献指南

我们欢迎社区贡献！如果您想添加新的 Agent 角色或接入新的数据源：
1. 在 `agents/` 目录下继承 `ReActAgent` 或 `SimpleAgent` 创建新角色。
2. 在 `tools/` 下编写配套工具。
3. 在 `agents/coordinator.py` 中注册新 Agent。

## 📄 许可证

MIT License. Copyright (c) 2026.
