#!/bin/bash
# Start both backend and frontend from the root directory
# Usage: ./dev.sh

trap 'kill 0' EXIT

# Backend
(cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0) &

# Frontend
(cd frontend && npx expo start) &

wait
