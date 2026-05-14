import cv2
import easyocr
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

# Define the exact JSON structure we want from Gemini using Pydantic models
class ReceiptItem(BaseModel):
    name: str
    price: float

class Receipt(BaseModel):
    store_name: str
    date: Optional[str]
    items: List[ReceiptItem]
    tax_amount: float
    total_amount: float


def main():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env file!")
        return

    # Initialize the modern Client
    client = genai.Client(api_key=api_key)

    print("Initializing OCR Engine...")
    reader = easyocr.Reader(['en']) 

    image_path = "receipt.jpg"
    img = cv2.imread(image_path)

    if img is None:
        print(f"Error: Could not find '{image_path}'.")
        return

    gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    print("Extracting raw text from image...")
    results = reader.readtext(gray_img, detail=0) 
    raw_text = "\n".join(results)

    print("\n--- RAW OCR OUTPUT ---")
    print(raw_text)
    print("----------------------\n")

    print("Sending raw text to Gemini for structuring...")
    
    # Lighter prompt engineering since we're using structured outputs
    prompt = f"Extract the receipt data from this raw OCR text:\n\n{raw_text}"

    # Using the gemini-2.5-flash model with Structured Outputs enabled
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Receipt,
        ),
    )
    
    print("--- CLEAN JSON OUTPUT ---")
    print(response.text.strip())
    print("-------------------------")

if __name__ == "__main__":
    main()