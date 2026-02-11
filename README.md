<div align="center">

# 💰 Smart Fund Assistant Pro
### 智能基金投资助手 —— 您的私人 AI 投顾天团

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![HelloAgents](https://img.shields.io/badge/AI_Framework-HelloAgents-orange.svg?style=flat-square)](https://github.com/GoogleDeepMind/HelloAgents)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

[功能演示](#-核心功能) • [Agent架构](#-ai-专家团队架构) • [快速开始](#-快速开始) • [部署指南](#-部署指南) • [技术栈](#-技术栈)

---

<p align="center">
  <strong>8 位 AI 专家联手 ｜ 全感官交互看板 ｜ 实时市场洞察 ｜ RAG 知识库导航</strong>
</p>

</div>

---

## 📖 项目简介

**Smart Fund Assistant Pro** 是基于 Google DeepMind **HelloAgents Framework** 构建的下一代智能投顾系统。

它不仅仅是一个聊天机器人，而是一个由 **8 个专业智能体 (Agents)** 组成的虚拟金融专家团队。通过 **ReAct**、**Plan-and-Solve**、**Reflection** 和 **Chain-of-Thought** 等先进 AI 范式，它们协同工作，为您提供从宏观策略到微观量化的全方位投资服务。

结合 **Glassmorphism (玻璃拟态)** 设计理念的现代化前端，为您带来沉浸式的资产管理体验。

---

## 🧠 AI 专家团队架构

本项目展示了 HelloAgents 框架的强大能力，集成了多种 Agent 模式。

### 系统架构图

```mermaid
graph TD
    User([👤 用户]) <--> |WebSocket/HTTP| API_Gateway[FastAPI 网关]
    
    subgraph "🤖 AI Agent Team (HelloAgents Framework)"
        API_Gateway --> Coordinator[👩‍💼 总协调员\n(ReActAgent)]
        
        Coordinator --> |任务分发| Strategist[🎩 首席策略师\n(CoT + Persona)]
        Coordinator --> |任务分发| Analyst[📈 技术分析师\n(Reflection)]
        Coordinator --> |任务分发| Quant[🧮 量化专家\n(Code Interpreter)]
        Coordinator --> |任务分发| Intelligence[🕵️ 市场侦察兵\n(GraphRAG)]
        Coordinator --> |任务分发| Advisor[📝 投资顾问\n(PlanAndSolve)]
        Coordinator --> |任务分发| Shadow[👥 影子分析师\n(ReAct)]
        Coordinator --> |任务分发| DailyReport[📅 日报专员\n(Simple)]
    end
    
    subgraph "🧠 记忆与知识库"
        VectorDB[(Qdrant 向量库)] <--> |RAG 检索| Intelligence
        VectorDB <--> |研报查询| Analyst
        SQLDB[(SQLite 业务库)] <--> |持仓数据| Coordinator
    end
    
    subgraph "🔌 外部工具链"
        Quant --> |Python 执行| CodeSandbox[代码沙箱]
        Intelligence --> |搜索/新闻| WebSearch[联网搜索]
        All_Agents --> |行情数据| MarketData[AkShare/TuShare]
    end
```

### Agent 角色详情

| 角色 | Agent 类型 | 核心能力 & 职责 |
| :--- | :--- | :--- |
| **👩‍💼 总协调员 (Coordinator)** | `ReActAgent` | **意图识别与任务分发**。作为用户的主入口，智能判断需求并调度相应的专家。 |
| **🎩 首席策略师 (Strategist)** | `ReAct` + `CoT` + `Persona` | **宏观决策与资产配置**。采用思维链 (Chain-of-Thought) 进行深思熟虑，支持切换"激进/稳健/保守"人格。 |
| **📈 技术分析师 (Analyst)** | `ReflectionAgent` | **K线与趋势分析**。具备"自我反思"能力，自我审查分析报告的准确性，拒绝幻觉。 |
| **🧮 量化专家 (Quant)** | `SimpleAgent` + `CodeInterpreter` | **硬核数据计算**。内置 Python 代码解释器，实时编写代码计算夏普比率、最大回撤等复杂指标。 |
| **🕵️ 市场侦察兵 (Intelligence)** | `ReAct` + `GraphRAG` | **情报搜集与关联分析**。利用知识图谱 (GraphRAG) 分析供应链与竞争关系，解读新闻影响。 |
| **📝 投资顾问 (Advisor)** | `PlanAndSolveAgent` | **长周期规划**。擅长将复杂的理财目标（如"通过定投攒够首付"）拆解为可执行的分步计划。 |
| **👥 影子分析师 (Shadow)** | `ReActAgent` | **社交投资跟踪**。分析"大V"或基金经理的持仓风格，进行 Brinson 归因分析与风格漂移检测。 |
| **📅 日报专员 (DailyReport)** | `SimpleAgent` | **自动化汇报**。每日自动生成个性化的账户盈亏简报与市场复盘。 |

---

## ✨ 核心功能

### 1. 💎 沉浸式投资看板
*   **全览视图**: 3D 悬浮卡片展示总资产、日收益与持仓分布。
*   **实时图表**: 集成 TradingView 轻量级图表，支持分钟级 K 线与交互式绘图。
*   **暗黑模式**: 深度适配的玻璃拟态 UI，科技感十足。

### 2. 💬 全感官智能对话
*   **流式响应**: 像真人一样逐字输出，支持 Markdown 表格、数学公式渲染。
*   **动态组件**: AI 可以在对话中直接插入动态图表（如持仓饼图、收益曲线），所见即所得。
*   **多模态输入**: (规划中) 支持上传财报截图进行分析。

### 3. 🛡️ 企业级数据与风控
*   **实时行情**: 对接 AkShare、TuShare 等数据源，覆盖 A 股、港股、ETF 与宏观数据。
*   **RAG 知识库**: 内置向量数据库 (Qdrant)，自动索引本地 PDF 研报，回答有理有据，来源可溯。
*   **隐私安全**: 核心数据本地存储 (SQLite)，支持 JWT 身份认证。

---

## 🛠️ 技术栈

### 前端 (Frontend)
*   **框架**: React 19, TypeScript, Vite
*   **UI 库**: TailwindCSS, Framer Motion (动画), Lucide React (图标)
*   **数据流**: Zustand, React Query
*   **可视化**: Lightweight Charts, Recharts

### 后端 (Backend)
*   **核心框架**: FastAPI (Python 3.10+)
*   **AI 引擎**: **HelloAgents Framework** (Agent 编排与通信)
*   **LLM 支持**: DeepSeek-V3, Qwen2.5, OpenAI GPT-4o (兼容所有 OpenAI 格式接口)
*   **数据库**: SQLite (业务数据), Qdrant (向量数据)
*   **工具链**: AkShare (金融数据), PyPDF2 (文档解析)

### 📂 项目目录结构

```bash
fund_assistant/
├── agents/                 # 🤖 Agent 角色定义 (ReAct/PlanAndSolve/etc)
├── api/                    # 🔌 FastAPI 路由接口
├── data/                   # 💾 本地数据库 (SQLite + Qdrant)
├── frontend-pro/           # ⚛️ React 前端项目源码
│   ├── src/components/     # UI 组件
│   └── src/pages/          # 页面视图
├── hello_agents/           # 🧠 HelloAgents 框架核心
├── knowledge/              # 📚 RAG 知识库文件 (PDF/MD)
├── services/               # ⚙️ 业务逻辑层
├── tools/                  # 🛠️ 工具函数 (行情/代码解释器)
├── server.py               # 🚀 后端启动入口
└── docker-compose.yml      # 🐳 Docker 编排文件
```

---

## 🚀 快速开始

### 方法一：Docker 一键部署 (推荐) 🐳

无需配置繁杂的 Python 环境，由 Docker 处理一切。

```bash
# 1. 克隆仓库
git clone https://github.com/pukueh/fund-assistant.git
cd fund-assistant

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入您的 LLM_API_KEY
vim .env

# 3. 启动服务
docker-compose up -d --build
```

访问浏览器：`http://localhost:8080` 即可开始对话！

### 方法二：手动本地开发

<details>
<summary>点击展开详细步骤</summary>

**1. 后端启动**
```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python server.py
```

**2. 前端启动**
```bash
cd frontend-pro
npm install
npm run dev
```
</details>

---

## 📦 生产环境部署 (Linux/宝塔)

针对 CentOS 7 / Ubuntu 等服务器的部署最佳实践：

1.  **准备环境**: 安装 Python 3.10+ 和 Node.js 18+。
2.  **兼容性处理** (CentOS 7 特供):
    ```bash
    # 避免编译错误的二进制安装方式
    pip install pandas==2.0.3 tiktoken curl_cffi==0.5.10 --only-binary :all:
    pip install -r requirements.txt
    ```
3.  **构建前端**:
    ```bash
    cd frontend-pro
    npm run build
    # 产物在 frontend-pro/dist，后端 server.py 会自动托管此目录
    ```
4.  **后台运行**:
    ```bash
    nohup python server.py > server.log 2>&1 &
    ```
5.  **Nginx 反向代理**:
    配置 `location /` 转发至 `http://127.0.0.1:8080`，并开启 WebSocket 支持 (Upgrade 头)。

---

## 🤝 贡献与反馈

欢迎提交 Issue 和 Pull Request！我们尤其欢迎以下方向的贡献：
*   新增更多类型的 Agent 角色
*   对接更多的金融数据源
*   UI/UX 的持续优化

## 📄 开源协议

MIT License. Copyright (c) 2026
