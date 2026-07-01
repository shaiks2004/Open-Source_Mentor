# Serverless Functions API Specifications

OpenSource Mentor provides serverless Python endpoints running inside the AgentBox environment.

## Endpoints

### 1. `validate_github_url`
Validates input repository URL string and parses the owner and repository name.
- **Input**: `url: str`
- **Output**: `is_valid: bool, owner: str | None, repo: str | None, error: str | None`

### 2. `fetch_github_repo`
Fetches repository metadata and README/CONTRIBUTING files from GitHub API.
- **Input**: `owner: str, repo: str`
- **Output**: `name: str, url: str, stars: int, primary_language: str, description: str, readme_content: str, contributing_content: str, error: str | None`

### 3. `fetch_github_issues`
Fetches open issues from a repository.
- **Input**: `owner: str, repo: str, limit: int`
- **Output**: `issues: list[IssueItem], error: str | None`

### 4. `create_repositories_record`
Creates or resolves a repository record in the datastore.
- **Input**: `name: str, url: str, description: str, language: str, stars: int`
- **Output**: `id: str, name: str, url: str, error: str | None`

### 5. `create_knowledge_record`
Creates or updates documentation inside the knowledge datastore.
- **Input**: `repository_id: str, content_type: str, title: str, content: str, source_file: str`
- **Output**: `id: str, success: bool, error: str | None`

### 6. `update_issue_record`
Inserts or updates issue records.
- **Input**: `repository_id: str, gh_issue_id: int, title: str, status: str`
- **Output**: `id: str, success: bool, error: str | None`
