from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import easyocr
import os
from dotenv import load_dotenv

# Modern Google GenAI SDK and Pydantic
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional

# Load Environment Variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in .env file!")

# Initialize AI Models Globally (So they don't reload on every request)
print("Loading AI Models into memory...")
client = genai.Client(api_key=api_key)
reader = easyocr.Reader(['en'])

# Define our strictly typed output structure
class ReceiptItem(BaseModel):
    name: str
    price: float

class Receipt(BaseModel):
    store_name: str
    date: Optional[str]
    items: List[ReceiptItem]
    tax_amount: float
    total_amount: float

# Initialize the FastAPI Server
app = FastAPI(title="Smart Receipt API")

# Allow our future React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/extract", response_model=Receipt)
async def extract_receipt(file: UploadFile = File(...)):
    """
    Endpoint that accepts an image upload, runs OCR, and returns structured JSON.
    """
    try:
        # Read the uploaded file into an OpenCV format
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file format")

        # Run OCR
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        results = reader.readtext(gray_img, detail=0)
        raw_text = "\n".join(results)

        # Parse with Gemini Structured Outputs
        prompt = f"Extract the receipt data from this raw OCR text:\n\n{raw_text}"
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=Receipt,
            ),
        )
        
        import json
        return json.loads(response.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")