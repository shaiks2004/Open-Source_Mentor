# Contributing Guidelines

Thank you for contributing to OpenSource Mentor!

## Coding Conventions
1. **SOLID Design**: Ensure all functions have a single responsibility.
2. **Type Safety**: Write strict TypeScript types in apps, and use Pydantic models for Python functions.
3. **No Placeholders**: Never write incomplete or mock logic in PRs.

## Development Workflow
1. Create a branch matching your feature description.
2. Implement backend tables and serverless functions in Python.
3. Test locally using `lemma stack`.
4. Ensure the frontend Vite project compiles with no errors:
   ```bash
   npm run build
   ```
5. Submit a PR for AI review.
