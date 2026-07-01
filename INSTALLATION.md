# Local Installation Guide

This guide details how to import and run OpenSource Mentor locally on top of the Lemma local stack.

## Prerequisites
- Node.js >= 18
- Python >= 3.10
- Lemma CLI (`npm install -g lemma-cli`)
- A running local Lemma stack (`lemma stack start`)

## Step 1: Import the Pod Bundle
To import this pod folder directly into your local Lemma stack:
```bash
lemma pod import C:\Projects\opensource-mentor
```

## Step 2: Configure Environment Variables
Define the following environment variables inside your stack run configuration:
- `GITHUB_API_TOKEN`: A GitHub personal access token used to avoid API rate limiting when fetching repositories and issues.

## Step 3: Run the Frontend App
To run the operator portal in development mode:
```bash
cd apps/frontend/source
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
