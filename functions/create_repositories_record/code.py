#input_type_name: CreateRepositoriesRecordInput
#output_type_name: CreateRepositoriesRecordResult
#function_name: create_repositories_record

from pydantic import BaseModel
from lemma_sdk import Lemma, FunctionContext

class CreateRepositoriesRecordInput(BaseModel):
    name: str
    url: str
    description: str | None = None
    language: str | None = None
    stars: int | None = 0

class CreateRepositoriesRecordResult(BaseModel):
    id: str | None = None
    name: str
    url: str
    error: str | None = None

async def create_repositories_record(ctx: FunctionContext, data: CreateRepositoriesRecordInput) -> CreateRepositoriesRecordResult:
    try:
        lemma = Lemma.from_env()
        pod = lemma.pod(str(ctx.pod_id))
        
        # Check if repository record already exists
        res = pod.records.list("repositories", filter=[{"field": "url", "op": "eq", "value": data.url.strip()}])
        if res.items:
            existing = res.items[0].to_dict() if hasattr(res.items[0], "to_dict") else dict(res.items[0])
            return CreateRepositoriesRecordResult(
                id=existing.get("id"),
                name=existing.get("name"),
                url=existing.get("url")
            )
            
        record_data = {
            "name": data.name,
            "url": data.url.strip(),
            "description": data.description,
            "language": data.language,
            "stars": data.stars or 0,
            "difficulty_level": "beginner",
            "archived": False
        }
        
        created = pod.table("repositories").create(record_data)
        return CreateRepositoriesRecordResult(
            id=created.get("id"),
            name=created.get("name"),
            url=created.get("url")
        )
    except Exception as e:
        return CreateRepositoriesRecordResult(
            name=data.name,
            url=data.url,
            error=str(e)
        )
