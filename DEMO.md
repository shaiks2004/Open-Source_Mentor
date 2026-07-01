# Demo and Presentation Script

This script helps presenters run a live demonstration of the OpenSource Mentor workspace.

## Demo Preparation
1. Ensure the pod is imported and running:
   ```bash
   lemma pod import C:\Projects\opensource-mentor
   ```
2. Set up a mock profile in the **Settings** panel (Jane Doe, beginner, python developer).

## Walkthrough Flow

### 1. Repository Onboarding
1. Go to **Repositories** tab.
2. Enter a GitHub URL (e.g. `https://github.com/django/django` or a smaller repository).
3. Click **Import**.
4. Show that the backend imports it, runs the analyzer, and saves the README in the datastore.

### 2. Architecture Explanation
1. Click the imported repository to open details.
2. Open the **Architecture Docs** tab.
3. Show the parsed architecture descriptions and the visual Mermaid diagrams representing packages and dependencies.

### 3. Issue Assignment
1. Open the **Issue Workspace** tab.
2. Notice the beginner-friendly issues selected by the `issue-recommender` agent.
3. Click **Claim Ticket** on an issue. Show that it assigns the issue to the active developer profile and creates a task log.

### 4. Learning Checklist
1. Open the **Learning Center** tab.
2. Walk through the generated onboarding steps.
3. Select checkpoint answers and complete a check.

### 5. Pull Request Review
1. Open the **PR Review** tab.
2. Select a pull request.
3. Click **Re-Run AI review**.
4. Show the AI review feedback and refactoring code diff changes.
