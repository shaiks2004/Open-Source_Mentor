#input_type_name: ValidateGitHubUrlInput
#output_type_name: ValidateGitHubUrlResult
#function_name: validate_github_url

import re
from pydantic import BaseModel
from lemma_sdk import FunctionContext

class ValidateGitHubUrlInput(BaseModel):
    url: str

class ValidateGitHubUrlResult(BaseModel):
    is_valid: bool
    owner: str | None = None
    repo: str | None = None
    error: str | None = None

async def validate_github_url(ctx: FunctionContext, data: ValidateGitHubUrlInput) -> ValidateGitHubUrlResult:
    url = data.url.strip()
    # Support both http/https and raw owner/repo URLs
    pattern = r"^(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?(?:/)?$"
    match = re.match(pattern, url)
    if not match:
        return ValidateGitHubUrlResult(
            is_valid=False,
            error="URL must be a valid GitHub repository link (e.g., https://github.com/owner/repo)."
        )
    owner = match.group(1)
    repo = match.group(2)
    return ValidateGitHubUrlResult(
        is_valid=True,
        owner=owner,
        repo=repo
    )
