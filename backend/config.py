from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    GEMINI_API_KEY: str = ""
    SERPAPI_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = ""

    # Bhashini (ULCA / Dhruva) Settings
    BHASHINI_USER_ID: str = ""
    BHASHINI_API_KEY: str = ""
    BHASHINI_INFERENCE_API_KEY: str = ""
    BHASHINI_PIPELINE_ENDPOINT: str = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    BHASHINI_CONFIG_ENDPOINT: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    BHASHINI_PIPELINE_ID: str = ""

    # Cashfree Payment Gateway Settings
    CASHFREE_ENV: str = "SANDBOX"  # 'SANDBOX' or 'PRODUCTION'
    CASHFREE_APP_ID: str = ""
    CASHFREE_SECRET_KEY: str = ""
    CASHFREE_API_VERSION: str = "2023-08-01"
    CASHFREE_RETURN_URL: str = ""
    CASHFREE_NOTIFY_URL: str = ""
    BACKEND_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
