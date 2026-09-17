from pydantic import BaseModel
from typing import Optional

class SupportRequestCreate(BaseModel):
    category: str
    issue_summary: str
    description: str
    related_id: Optional[str] = None
    artisan_id: Optional[str] = None

class SupportRequestUpdate(BaseModel):
    status: str
