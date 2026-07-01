#input_type_name: FetchGitHubRepoInput
#output_type_name: FetchGitHubRepoResult
#function_name: fetch_github_repo

import os
import base64
import urllib.request
import urllib.error
import json
from pydantic import BaseModel
from lemma_sdk import FunctionContext

class FetchGitHubRepoInput(BaseModel):
    owner: str
    repo: str

class FetchGitHubRepoResult(BaseModel):
    name: str
    url: str
    stars: int
    primary_language: str | None = None
    description: str | None = None
    readme_content: str | None = None
    contributing_content: str | None = None
    error: str | None = None

def _make_github_request(url: str, token: str | None) -> dict | None:
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "OpenSource-Mentor-Agent")
    req.add_header("Accept", "application/vnd.github.v3+json")
    if token:
        req.add_header("Authorization", f"token {token}")
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        return None

async def fetch_github_repo(ctx: FunctionContext, data: FetchGitHubRepoInput) -> FetchGitHubRepoResult:
    token = os.environ.get("GITHUB_API_TOKEN")
    
    # 1. Fetch main repo metadata
    repo_url = f"https://api.github.com/repos/{data.owner}/{data.repo}"
    meta = _make_github_request(repo_url, token)
    if not meta:
        return FetchGitHubRepoResult(
            name=data.repo,
            url=f"https://github.com/{data.owner}/{data.repo}",
            stars=0,
            error=f"Could not retrieve repository metadata for {data.owner}/{data.repo}. Verify connection or rate limits."
        )
    
    # 2. Fetch README content
    readme_url = f"https://api.github.com/repos/{data.owner}/{data.repo}/readme"
    readme_meta = _make_github_request(readme_url, token)
    readme_text = None
    if readme_meta and "content" in readme_meta:
        try:
            readme_text = base64.b64decode(readme_meta["content"]).decode("utf-8", errors="ignore")
        except Exception:
            pass
            
    # 3. Fetch CONTRIBUTING.md content (common locations)
    contrib_text = None
    for filename in ["CONTRIBUTING.md", "contributing.md", ".github/CONTRIBUTING.md"]:
        contrib_url = f"https://api.github.com/repos/{data.owner}/{data.repo}/contents/{filename}"
        contrib_meta = _make_github_request(contrib_url, token)
        if contrib_meta and "content" in contrib_meta:
            try:
                contrib_text = base64.b64decode(contrib_meta["content"]).decode("utf-8", errors="ignore")
                break
            except Exception:
                pass

    return FetchGitHubRepoResult(
        name=meta.get("name", data.repo),
        url=meta.get("html_url", f"https://github.com/{data.owner}/{data.repo}"),
        stars=meta.get("stargazers_count", 0),
        primary_language=meta.get("language"),
        description=meta.get("description"),
        readme_content=readme_text,
        contributing_content=contrib_text
    )
