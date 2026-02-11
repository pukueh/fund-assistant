#!/bin/bash

# Configuration
BACKEND_PORT=8080
FRONTEND_PORT=3000
BACKEND_CMD="python server.py"
FRONTEND_DIR="frontend-pro"
FRONTEND_CMD="npm run dev"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Fund Assistant Pro...${NC}"

# 1. Clean up potential old processes (force stop)
echo -e "${YELLOW}🧹 Cleaning up old processes...${NC}"
lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null
pkill -f "$BACKEND_CMD" 2>/dev/null

# 2. Start Backend
echo -e "${GREEN}🔥 Starting Backend Server (Port $BACKEND_PORT)...${NC}"
nohup python server.py > server.log 2>&1 &
BACKEND_PID=$!
echo -e "Backend PID: ${BACKEND_PID}"

# Wait for backend to be ready (simple check)
sleep 2

# 3. Start Frontend
echo -e "${GREEN}🎨 Starting Frontend Dev Server (Port $FRONTEND_PORT)...${NC}"
cd $FRONTEND_DIR
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "Frontend PID: ${FRONTEND_PID}"
cd ..

echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${YELLOW}👉 Dashboard: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${YELLOW}👉 API Docs : http://localhost:$BACKEND_PORT/docs${NC}"
echo -e "${YELLOW}📝 Logs are being written to server.log and frontend-pro/frontend.log${NC}"
