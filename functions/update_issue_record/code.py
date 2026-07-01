#input_type_name: UpdateIssueRecordInput
#output_type_name: UpdateIssueRecordResult
#function_name: update_issue_record

from pydantic import BaseModel
from lemma_sdk import Lemma, FunctionContext

class UpdateIssueRecordInput(BaseModel):
    repository_id: str
    gh_issue_id: int
    title: str
    description: str | None = None
    labels: list[str] | None = None
    difficulty_score: int | None = None
    is_beginner_friendly: bool | None = None
    suggested_skills: list[str] | None = None
    estimated_hours: int | None = None
    status: str | None = "open"
    assigned_to_user_id: str | None = None
    gh_url: str | None = None

class UpdateIssueRecordResult(BaseModel):
    id: str | None = None
    success: bool
    error: str | None = None

async def update_issue_record(ctx: FunctionContext, data: UpdateIssueRecordInput) -> UpdateIssueRecordResult:
    try:
        lemma = Lemma.from_env()
        pod = lemma.pod(str(ctx.pod_id))
        
        # Check if issue already exists in database
        res = pod.records.list(
            "issues",
            filter=[
                {"field": "repository_id", "op": "eq", "value": data.repository_id},
                {"field": "gh_issue_id", "op": "eq", "value": data.gh_issue_id}
            ]
        )
        
        update_data = {
            "title": data.title,
            "description": data.description,
            "labels": data.labels,
            "gh_url": data.gh_url
        }
        
        if data.difficulty_score is not None:
            update_data["difficulty_score"] = data.difficulty_score
        if data.is_beginner_friendly is not None:
            update_data["is_beginner_friendly"] = data.is_beginner_friendly
        if data.suggested_skills is not None:
            update_data["suggested_skills"] = data.suggested_skills
        if data.estimated_hours is not None:
            update_data["estimated_hours"] = data.estimated_hours
        if data.status is not None:
            update_data["status"] = data.status
        if data.assigned_to_user_id is not None:
            update_data["assigned_to_user_id"] = data.assigned_to_user_id
            
        if res.items:
            existing = res.items[0].to_dict() if hasattr(res.items[0], "to_dict") else dict(res.items[0])
            record_id = existing.get("id")
            pod.table("issues").update(record_id, update_data)
            return UpdateIssueRecordResult(id=record_id, success=True)
        else:
            # Create new issue
            insert_data = {
                "repository_id": data.repository_id,
                "gh_issue_id": data.gh_issue_id,
                "is_beginner_friendly": data.is_beginner_friendly or False,
                "status": data.status or "open",
                **update_data
            }
            created = pod.table("issues").create(insert_data)
            return UpdateIssueRecordResult(id=created.get("id"), success=True)
            
    except Exception as e:
        return UpdateIssueRecordResult(
            success=False,
            error=str(e)
        )
