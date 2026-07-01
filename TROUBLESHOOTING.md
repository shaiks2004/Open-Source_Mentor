# OpenSource Mentor — Troubleshooting Guide

This guide details common issues you may encounter when building, importing, or running OpenSource Mentor, along with instructions to diagnose and resolve them.

---

## 1. CLI Authentication and Token Errors

### Symptoms
Running `lemma pod doctor` or `lemma pod import` yields:
```
Missing token. Pass --token, set LEMMA_TOKEN, or run `lemma auth login`.
```

### Resolution
1. **Local stack check**: Make sure the local Lemma dev stack is running:
   ```bash
   lemma stack status
   ```
2. **Login**: Perform a local login step:
   ```bash
   lemma auth login --server http://localhost:8000
   ```
3. **Environment variables**: Ensure `LEMMA_TOKEN` or `LEMMA_SERVER` is exported in your environment.

---

## 2. GitHub API Rate Limiting

### Symptoms
Repository imports succeed but return no metadata, or issues fetch step returns:
```
Failed to retrieve GitHub issues: HTTP Error 403: Forbidden
```

### Cause
The GitHub REST API restricts unauthenticated requests to 60 per hour per IP. OpenSource Mentor hits this ceiling quickly when parsing large repositories.

### Resolution
Generate a GitHub Personal Access Token (PAT) and define it in your environment:
```bash
# Windows (PowerShell)
$env:GITHUB_API_TOKEN="ghp_yourtokenhere"

# Linux/macOS
export GITHUB_API_TOKEN="ghp_yourtokenhere"
```
Re-run the workflow or import sequence.

---

## 3. Pod Schema Mismatches and Import Failures

### Symptoms
Executing `lemma pod import` fails with syntax validation errors or database constraints.

### Diagnosis
Run the static validator check script to locate broken files, bad JSON formats, or compiler errors:
```bash
python scratch/pod_check.py
```

### Common Fixes
1. **Invalid JSON**: Check that comments are not included in `.json` files (use standard JSON parser compliance).
2. **Missing References**: Ensure that foreign keys (e.g. `repositories.id`) point to table names that actually exist in your `/tables` directory.
3. **Pydantic Validation**: Ensure that outputs of functions conform to the schemas defined in Pydantic models. For instance, `pod_id` and `user_id` must be valid UUID formats.

---

## 4. Frontend Build/TypeScript Errors

### Symptoms
Running `npm run build` inside `apps/frontend/source` yields type mismatches like:
```
Type 'Record<string, unknown>' is not assignable to type '...'
```

### Diagnosis and Resolution
The `lemma-sdk` returns objects typed as `Record<string, unknown>`. If your UI code expects a specific shape, you must use type guards or index signatures:
1. Ensure your interface declarations in `src/` include index signatures:
   ```typescript
   interface Repository {
     id: string;
     name: string;
     url: string;
     [key: string]: unknown; // Satisfies Record<string, unknown>
   }
   ```
2. Or cast the results of API calls using type assertions:
   ```typescript
   const repo = result as Repository;
   ```

---

## 5. Workflow Execution Blocked or Stuck

### Symptoms
Workflows show a status of `RUNNING` indefinitely, or nodes fail silently.

### Resolution
1. **Retrieve Logs**: Query execution records using the CLI:
   ```bash
   lemma workflow run list
   lemma workflow run describe --run-id <run-uuid>
   ```
2. **Check AgentBox Status**: Make sure your local execution runner has access to Python and can execute asynchronous loops.
3. **Agent Prompts**: If an agent node is stuck, verify that it isn't waiting on a tool response it didn't request. Ensure instructions are specific about the expected database table writes to signify completion.
