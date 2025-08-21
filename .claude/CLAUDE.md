# RABHAN Solar BNPL Platform - Development Guide

This is a real project, no simple / basic things, no todos, No Mock data, top quality code must be needed always.
This is a real project, don't delete and don't create simple, basic, fix pages, do fix on original code.

Use sonnet model default

Have some commonsense and Web development experience as USER

## Development Guidelines

1. Must follow theme style, no hardcoding
2. Must follow i18n, no hardcoding
3. Must be responsive, mobile first design
4. Fully optimized, secure and API<5ms
5. Must do what user asked for nothing more nothing less, it's a strict rule.

Each service backend (bdev.md) first then connect to frontend (fdev.md), security + compliances + testing. Complete functional. If all are completed then only next service.

Get the tasks from E:\RABHAN\DOCS\MVP_tasks.md, update your log if user approved this task is completed.
- If it's backend task use E:\RABHAN\DOCS\bdev.md
- If it's front-end use E:\RABHAN\DOCS\fdev.md, must follow the guidelines.

Read the codebase what already have built and understand the project to continue.
Summarize what you are going to build, ask permissions to code.

## Service Ports

- Frontend running on 3000
- Auth service on 3001  
- User service on 3002
- Document service on 3003
- Contractor service 3004
- Solar calculator 3005
- Marketplace service 3007

## Design System

- Theme color: #3eb2b1
- Logo: E:\RABHAN\DOCS\rabhan_logo.svg
- You can get logo colors directly for frontend

## Security Requirements

Please check through all the code you just wrote and make sure it follows security best practices. Make sure there are no sensitive information in the frontend and there are no vulnerabilities that can be exploited.

## Learning from Claude

Please explain the functionality and code you just built out in detail. Walk me through what you changed and how it works. Act like you're a senior engineer teaching me code.

## Important Instructions

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.