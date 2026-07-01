# Project Structure Layout

This file maps the filesystem directories of the OpenSource Mentor pod application.

```
C:\Projects\opensource-mentor
├── pod.json                     # Main pod manifest file
├── README.md                    # Introduction and overview
├── INSTALLATION.md              # Local installation instructions
├── DEPLOYMENT.md                # Production stack configuration
├── ARCHITECTURE.md              # Architecture layers guide
├── CONTRIBUTING.md              # Developers instructions
├── API.md                       # API function contracts
├── DEMO.md                      # Demonstration setup script
├── CHANGELOG.md                 # Project version release logs
├── tables/                      # Datastore schemas
│   ├── repositories/
│   ├── issues/
│   ├── tasks/
│   ├── learning_modules/
│   ├── progress/
│   ├── pull_requests/
│   ├── reviews/
│   ├── knowledge/
│   └── users/
├── functions/                   # Serverless Python functions
│   ├── validate_github_url/
│   ├── fetch_github_repo/
│   ├── fetch_github_issues/
│   ├── create_repositories_record/
│   ├── create_knowledge_record/
│   └── update_issue_record/
├── agents/                      # LLM Agents specifications
│   ├── repository-analyzer/
│   ├── architecture-explainer/
│   ├── issue-recommender/
│   ├── learning-coach/
│   ├── contribution-tracker/
│   └── pr-review-assistant/
├── workflows/                   # Directed Acyclic Graph (DAG) definitions
│   ├── import-repository/
│   ├── recommend-issues/
│   ├── review-pull-request/
│   ├── track-progress/
│   └── generate-weekly-report/
└── apps/                        # Frontend Operator Applications
    └── frontend/
        ├── frontend.json
        └── source/              # Vite React Project
```
