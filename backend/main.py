from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from PIL import Image
import io

# Modern Google GenAI SDK and Pydantic
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in .env file!")

print("Loading AI Models into memory...")
client = genai.Client(api_key=api_key)

# Define JSON structure
class ReceiptItem(BaseModel):
    name: str
    price: float

class Receipt(BaseModel):
    store_name: str
    date: Optional[str] = None
    items: List[ReceiptItem]
    subtotal: float
    tax_amount: float
    discount_amount: Optional[float] = 0.0
    total_amount: float

app = FastAPI(title="Smart Receipt API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/extract", response_model=Receipt)
async def extract_receipt(file: UploadFile = File(...)):
    try:
        # Read the uploaded image into memory using Pillow
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # Multimodal Gemini Processing
        # Pass the IMAGE and the PROMPT directly to the model
        prompt = "Extract the receipt data from this image."
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[image, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=Receipt,
            ),
        )
        
        import json
        return json.loads(response.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")