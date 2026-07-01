# OpenSource Mentor — User Guide

Welcome to **OpenSource Mentor**! This guide walks you through the features and user flows of your AI-native contribution workspace.

---

## Getting Started

### 1. Developer Profile Setup
When you first log in, navigate to the **Settings** or **Profile** section. OpenSource Mentor tailors its suggestions based on your profile:
- **Skill Level**: Select from *Beginner*, *Intermediate*, or *Advanced*.
- **Tech Stack**: Specify your preferred programming languages (e.g., Python, TypeScript, Rust) and frameworks (e.g., Django, React).
- **Weekly Commitment**: Set your weekly contribution goal (in hours).

---

## Core Workflows

### 2. Onboarding a Repository
To import a repository you want to contribute to:
1. Go to the **Repositories** tab.
2. Enter any public GitHub repository URL (e.g., `https://github.com/django/django`).
3. Click **Import Repository**.
4. The system will start an asynchronous import workflow (`import-repository`):
   - Validates the URL structure.
   - Fetches repository metadata and documentation.
   - Triggers the **Repository Analyzer** and **Architecture Explainer** agents to parse codebase files.
   - Saves architectural summaries and indexes files into the knowledge base.

---

### 3. Exploring Codebase Architecture
Once the repository is imported, select it from your list to open the detailed view:
1. Click on the **Architecture Guide** tab.
2. Read the structured breakdown of the repository's packages, folder structures, and key class relationships.
3. Inspect the automatically generated **Mermaid UML sequence diagrams** showing execution flows (e.g., router-to-controller routing).
4. Click on directory path links to open and view the code files.

---

### 4. Claiming a Beginner-Friendly Issue
The **Issue Workspace** tab helps you find issues that fit your skill level:
1. View the prioritized lists of open repository issues curated by the **Issue Recommender** agent.
2. Filter issues by `Difficulty Score` (1-100), `Suggested Skills`, or label.
3. Click **Claim Issue** on a ticket to assign it to yourself. This action:
   - Changes the issue status to `assigned` in the datastore.
   - Triggers the **Learning Coach** to generate a custom onboarding curriculum for that specific ticket.

---

### 5. Your Personalized Learning Path
After claiming an issue, navigate to the **Learning Center**:
1. Check your new learning syllabus divided into modules (e.g., "Prerequisite Setup", "Understanding Module X", "Implementation Plan").
2. Each module includes:
   - **Prerequisites**: Code patterns you should learn before editing.
   - **Checkpoints**: Incremental development steps.
   - **Quizzes**: Brief conceptual checks to confirm your understanding.
3. Complete checkpoints and check them off to update your progress.

---

### 6. Submitting and Reviewing Pull Requests
Once you write code and push it as a PR:
1. Navigate to the **PR Review** tab.
2. Click **Submit PR for AI Review** and provide the PR number or URL.
3. The **PR Review Assistant** agent will:
   - Perform a lint and security check.
   - Provide feedback on architectural patterns.
   - Render inline code replacement diff suggestions.
4. Review the suggestions and apply them directly to your branch.

---

### 7. Weekly Contribution Report
At the end of the week, check the **Dashboard** page:
1. View your weekly metrics, including hours spent, issues closed, and modules completed.
2. Download or read the automatically compiled **Weekly Progress Report** summarizing your achievements, blockers, and recommendations for the coming week.
