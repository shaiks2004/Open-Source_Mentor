#input_type_name: FetchGitHubIssuesInput
#output_type_name: FetchGitHubIssuesResult
#function_name: fetch_github_issues

import os
import urllib.request
import urllib.error
import json
from pydantic import BaseModel, Field
from lemma_sdk import FunctionContext

class FetchGitHubIssuesInput(BaseModel):
    owner: str
    repo: str
    limit: int = Field(default=30, ge=1, le=100)

class IssueItem(BaseModel):
    number: int
    title: str
    description: str | None = None
    labels: list[str] = Field(default_factory=list)
    html_url: str

class FetchGitHubIssuesResult(BaseModel):
    issues: list[IssueItem] = Field(default_factory=list)
    error: str | None = None

async def fetch_github_issues(ctx: FunctionContext, data: FetchGitHubIssuesInput) -> FetchGitHubIssuesResult:
    token = os.environ.get("GITHUB_API_TOKEN")
    
    url = f"https://api.github.com/repos/{data.owner}/{data.repo}/issues?state=open&per_page={data.limit}"
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "OpenSource-Mentor-Agent")
    req.add_header("Accept", "application/vnd.github.v3+json")
    if token:
        req.add_header("Authorization", f"token {token}")
        
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            items = json.loads(response.read().decode("utf-8"))
            
        issues_list = []
        for item in items:
            # GitHub issues API returns PRs as well; filter them out (they contain "pull_request" key)
            if "pull_request" in item:
                continue
            
            labels = [l["name"] for l in item.get("labels", []) if "name" in l]
            issues_list.append(IssueItem(
                number=item.get("number"),
                title=item.get("title", ""),
                description=item.get("body"),
                labels=labels,
                html_url=item.get("html_url", "")
            ))
            
        return FetchGitHubIssuesResult(issues=issues_list)
        
    except Exception as e:
        return FetchGitHubIssuesResult(
            issues=[],
            error=f"Failed to retrieve GitHub issues: {str(e)}"
        )
