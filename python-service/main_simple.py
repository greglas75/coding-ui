from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import random

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Brand Validation API (Simplified)", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

class FrontendValidationRequest(BaseModel):
    user_response: str
    category: str
    language: Optional[str] = "en"
    user_id: Optional[str] = None
    response_id: Optional[str] = None
    google_api_key: Optional[str] = None
    google_cse_cx_id: Optional[str] = None
    pinecone_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "brand-validation-simplified", "cors": "enabled"}

@app.post("/api/validate")
async def validate(request: FrontendValidationRequest):
    logger.info(f"Validation request: {request.user_response} for {request.category}")

    confidence = random.randint(85, 99)

    return {
        "type": "brand_identified",
        "confidence": confidence,
        "reasoning": f"Mock validation for '{request.user_response}' in category '{request.category}'",
        "ui_action": "approve",
        "brand": request.user_response,
        "variants": {request.user_response: 1},
        "risk_factors": [],
        "display_format": request.user_response,
        "translation": None,
        "vision_analysis": {"brandDetected": True, "brandName": request.user_response},
        "search_validation": {"found": True, "sources": ["google", "images"]}
    }

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 STARTING SIMPLIFIED BRAND VALIDATION API")
    print("📍 URL: http://localhost:8000")
    print("✅ CORS enabled for localhost:5173\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
