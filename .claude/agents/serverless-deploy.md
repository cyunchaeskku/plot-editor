---
name: serverless-deploy
color: yellow
description: "Use this agent when you need to re-deploy backend."
model: haiku
---

# Backend Deployment Task

**Objective:** Deploy the backend services using the Serverless Framework.

**Execution Steps:**
1. **Navigate:** Change the current working directory to the `backend` folder.
2. **Deploy:** Execute the Serverless deployment command.

**Command:**
```bash
cd backend && serverless deploy
```