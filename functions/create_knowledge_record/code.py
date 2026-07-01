#input_type_name: CreateKnowledgeRecordInput
#output_type_name: CreateKnowledgeRecordResult
#function_name: create_knowledge_record

from pydantic import BaseModel
from lemma_sdk import Lemma, FunctionContext

class CreateKnowledgeRecordInput(BaseModel):
    repository_id: str
    content_type: str  # readme, architecture, guide, summary, diagram
    title: str
    content: str
    source_file: str | None = None
    generated_by_agent: str | None = None

class CreateKnowledgeRecordResult(BaseModel):
    id: str | None = None
    success: bool
    error: str | None = None

async def create_knowledge_record(ctx: FunctionContext, data: CreateKnowledgeRecordInput) -> CreateKnowledgeRecordResult:
    try:
        lemma = Lemma.from_env()
        pod = lemma.pod(str(ctx.pod_id))
        
        # Check if record already exists with same repository_id and content_type/title
        res = pod.records.list(
            "knowledge",
            filter=[
                {"field": "repository_id", "op": "eq", "value": data.repository_id},
                {"field": "content_type", "op": "eq", "value": data.content_type},
                {"field": "title", "op": "eq", "value": data.title}
            ]
        )
        if res.items:
            # Update existing instead of creating duplicate
            existing = res.items[0].to_dict() if hasattr(res.items[0], "to_dict") else dict(res.items[0])
            record_id = existing.get("id")
            pod.table("knowledge").update(record_id, {
                "content": data.content,
                "source_file": data.source_file,
                "generated_by_agent": data.generated_by_agent
            })
            return CreateKnowledgeRecordResult(id=record_id, success=True)
            
        record_data = {
            "repository_id": data.repository_id,
            "content_type": data.content_type,
            "title": data.title,
            "content": data.content,
            "source_file": data.source_file,
            "generated_by_agent": data.generated_by_agent
        }
        
        created = pod.table("knowledge").create(record_data)
        return CreateKnowledgeRecordResult(
            id=created.get("id"),
            success=True
        )
    except Exception as e:
        return CreateKnowledgeRecordResult(
            success=False,
            error=str(e)
        )
