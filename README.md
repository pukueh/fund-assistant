<div align="center">

# 💰 Smart Fund Assistant Pro
### 智能基金投资助手 —— 您的私人 AI 投顾天团

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

[功能演示](#-核心功能) • [快速开始](#-快速开始) • [部署指南](#-部署指南) • [技术架构](#-技术架构) • [贡献](#-贡献)

---

<p align="center">
  <strong>8 位 AI 专家联手 ｜ 全感官交互看板 ｜ 实时市场洞察 ｜ RAG 知识库导航</strong>
</p>

</div>

---

## 📖 项目简介

**Smart Fund Assistant Pro** 不仅仅是一个基金数据查询工具，它重新定义了个人投资助理的形态。

我们利用 **HelloAgents Framework** 构建了一个由 **8 个专业智能体 (Agents)** 组成的虚拟投顾团队。无论您是想诊断持仓风险、寻找潜力板块，还是通过自然语言查询复杂的市场数据，这支 24/7 在线的 AI 团队都能为您提供基于实时数据与深度知识库的专业建议。

结合 **Glassmorphism (玻璃拟态)** 设计理念的现代化前端，为您带来沉浸式的资产管理体验。

---

## ✨ 核心功能

### 🤖 八合一专家团队 (Agent Team)
*   **👩‍💼 首席理财顾问 (Chief Advisor)**: 统筹全局，协调各专家为您提供综合建议。
*   **📊 数据分析师 (Data Analyst)**: 实时拉取市场行情、基金估值与经理排名。
*   **🛡️ 风控专家 (Risk Control)**: 深度扫描持仓风险，预警高回撤与相关性陷阱。
*   **🌍 宏观策略师 (Macro Strategist)**: 结合新闻与宏观数据，研判市场大势。
*   **📑 研报分析员 (Researcher)**: 基于 RAG 技术，快速提炼长篇研报核心观点。
*   **...以及更多专业角色**

### 💎 极致交互体验
*   **全感官对话**: 支持流式输出、Markdown 渲染、动态图表插入。
*   **实时看板**: 3D 悬浮组件展示今日收益、持仓分布与大盘走势。
*   **智能图表**: 集成 TradingView 级 K 线与交互式饼图，数据一目了然。

### 🧠 企业级 AI 能力
*   **RAG (检索增强生成)**: 自动索引本地 PDF/Markdown 知识库，回答有理有据。
*   **工具链集成**: 内置 Python 代码解释器，可现场编写代码进行复杂数据回测。

---

## 🛠️ 技术栈

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端** | **React 19** + **TypeScript** | 极致性能，Vite 构建 |
| **UI/UX** | **TailwindCSS** + **Framer Motion** | 玻璃拟态设计，丝滑流畅的动画 |
| **后端** | **FastAPI** + **HelloAgents** | 高性能异步框架，Agent 编排核心 |
| **LLM** | **DeepSeek-V3** / **Qwen2.5** | 支持 OpenAI 兼容协议的所有大模型 |
| **数据** | **SQLite** + **Qdrant** | 轻量级关系型数据库 + 向量检索引擎 |
| **采集** | **AkShare** + **Crawler** | 覆盖 A 股、港股、ETF 及宏观数据 |

---

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/pukueh/ImagineHosting.git
cd ImagineHosting
```

### 2. 配置环境
复制配置文件模板并填入您的 API Key（支持 DeepSeek, OpenAI 等）：
```bash
cp .env.example .env
vim .env
```

```env
# .env 示例
LLM_API_KEY=sk-xxxxxxxxxxxxxxxx
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL_ID=deepseek-chat
```

### 3. 一键启动 (Docker) 🐳 **推荐**
无需配置复杂的 Python/Node 环境，一键拉起所有服务：
```bash
docker-compose up -d --build
```
访问：`http://localhost:8080`

### 4. 手动启动 (开发模式)
<details>
<summary>点击展开手动部署步骤</summary>

**后端:**
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python server.py
```

**前端:**
```bash
cd frontend-pro
npm install
npm run dev
```
</details>

---

## 📦 部署指南 (Linux/宝塔)

针对云服务器（如阿里云、腾讯云）的生产环境部署最佳实践：

1.  **上传代码**: 将项目打包上传至服务器 `/www/wwwroot/fund_assistant`。
2.  **安装依赖**: 
    *   CentOS 7 等老系统推荐使用二进制包安装依赖，避免编译失败：
        ```bash
        pip install pandas==2.0.3 tiktoken curl_cffi==0.5.10 --only-binary :all:
        pip install -r requirements.txt
        ```
3.  **后台运行**:
    ```bash
    nohup python server.py > server.log 2>&1 &
    ```
4.  **域名配置**:
    *   在 Cloudflare 解析域名。
    *   Nginx 配置 `location /` 反向代理至 `127.0.0.1:8080`。

详细教程请参考 [DEPLOY_WITH_DOCKER.md](DEPLOY_WITH_DOCKER.md)。

---

## 📸 预览
*(此处建议稍后上传截图)*

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request

---

## 📄 开源协议

MIT License. Copyright (c) 2024 ImagineHosting.
