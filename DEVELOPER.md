# OpenSource Mentor — Developer Guide

This document is for developers who want to extend, modify, or contribute to the OpenSource Mentor pod codebase.

---

## Codebase Architecture

OpenSource Mentor is a **Lemma Pod**, which is a self-contained AI-native backend bundle containing:
1. **Tables** (`/tables`): Persistent schemas representing the domain entities.
2. **Functions** (`/functions`): Serverless Python endpoints doing calculations or external integrations.
3. **Agents** (`/agents`): Reasoning loops defined by prompts, tool permissions, and LLM backends.
4. **Workflows** (`/workflows`): DAG files connecting forms, functions, and agents.
5. **Apps** (`/apps`): Frontend web portals that present the UI to the user.

---

## Extending the Pod

### 1. Adding a New Table
To add a persistent table (e.g., `user_achievements`):
1. Create a directory `/tables/user_achievements`.
2. Add a `user_achievements.json` specifying the name, columns, types (e.g., `UUID`, `TEXT`, `JSON`, `BOOLEAN`, `INTEGER`, `ENUM`), and primary keys.
3. Register any required relationships (e.g. `foreign_key` reference pointing to `users.id`).

---

### 2. Creating a Serverless Function
Functions perform stateless operations (e.g., calling third-party APIs):
1. Create a directory under `/functions/<function_name>`.
2. Create `<function_name>.json` defining the name, description, type (`API` or `INTERNAL`), and optional schemas.
3. Write the Python logic inside `code.py`. Use Pydantic `BaseModel` for inputs/outputs and import `FunctionContext`:
   ```python
   #input_type_name: MyInput
   #output_type_name: MyResult
   #function_name: my_function

   from pydantic import BaseModel
   from lemma_sdk import FunctionContext

   class MyInput(BaseModel):
       param: str

   class MyResult(BaseModel):
       success: bool

   async def my_function(ctx: FunctionContext, data: MyInput) -> MyResult:
       # Your implementation here
       return MyResult(success=True)
   ```

---

### 3. Setting Up a Custom Agent
To add or modify an agent:
1. Create a directory `/agents/<agent_name>`.
2. Create `<agent_name>.json` configuring:
   - `toolsets`: E.g. `["POD", "WORKSPACE_CLI"]` to allow file and datastore access.
   - `permissions`: Read/write grants to specific tables or execute rights for specific functions.
   - `agent_runtime`: Profile ID indicating the LLM backend (e.g. `claude-3-5-sonnet`).
3. Write `instruction.md` detailing the agent's system prompt, goals, and response formats.

---

### 4. Designing a Workflow
Workflows choreograph human-in-the-loop steps:
1. Create a directory `/workflows/<workflow_name>`.
2. Create `<workflow_name>.json` specifying `nodes` (type `FORM`, `FUNCTION`, `AGENT`, `DECISION`, `HUMAN_APPROVAL`, or `END`) and `edges` representing the state transitions.
3. Map inputs and outputs using the expression syntax:
   ```json
   "input_mapping": {
     "repository_id": { "type": "expression", "value": "intake_node.repository_id" }
   }
   ```

---

## Local Development and Verification

### Python Setup
We use Python >= 3.10 and the local virtual environment `.venv`:
1. Activate the virtual environment.
2. Install dependencies:
   ```bash
   pip install -r .venv-requirements.txt  # Or similar dependencies file
   ```

### Running Static Audits
To inspect configurations, schema compliance, and compile Python functions:
```bash
python scratch/pod_check.py
```

### Running Unit/Integration Tests
To verify individual Python serverless functions using mocked Lemma environments:
```bash
python scratch/run_function_tests.py
```

### Frontend Development
To start the React frontend in HMR (Hot Module Replacement) mode:
```bash
cd apps/frontend/source
npm run dev
```
Build production bundle:
```bash
npm run build
```
The output is written to `/dist` and serves as a static asset bundle within the Lemma app environment.
