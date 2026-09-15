from typing import Optional
from pydantic import BaseModel

class MessageCreate(BaseModel):
    content: Optional[str] = None
    message: Optional[str] = None
