from pydantic import BaseModel

class SendOTPRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class SetRoleRequest(BaseModel):
    role: str

class EmailAuthRequest(BaseModel):
    email: str
    password: str
    phone: str | None = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str
