#!/bin/bash

# Configuration
BACKEND_PORT=8080
FRONTEND_PORT=3000
BACKEND_CMD="server.py"
FRONTEND_CMD="npm run dev"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping Fund Assistant Pro...${NC}"

# 1. Kill Backend processes on port 8080
PID_BACKEND=$(lsof -ti :$BACKEND_PORT)
if [ ! -z "$PID_BACKEND" ]; then
    echo -e "${RED}Killing Backend (PID: $PID_BACKEND)${NC}"
    kill -9 $PID_BACKEND
else
    echo -e "${YELLOW}No Backend process found on port $BACKEND_PORT${NC}"
fi

# 2. Kill Frontend processes on port 3000
PID_FRONTEND=$(lsof -ti :$FRONTEND_PORT)
if [ ! -z "$PID_FRONTEND" ]; then
    echo -e "${RED}Killing Frontend (PID: $PID_FRONTEND)${NC}"
    kill -9 $PID_FRONTEND
    # Also find and kill related Vite processes
    pkill -f "vite"
else
    echo -e "${YELLOW}No Frontend process found on port $FRONTEND_PORT${NC}"
fi

# 3. Clean up potentially hanging Python processes related to this script
echo -e "${YELLOW}Cleaning up any remaining Python server process...${NC}"
pkill -f "$BACKEND_CMD" 2>/dev/null

echo -e "${GREEN}✅ All services stopped.${NC}"
