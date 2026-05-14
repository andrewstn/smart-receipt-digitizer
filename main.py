import cv2
import easyocr

def main():
    print("Initializing OCR Engine (This may take a few seconds on the first run)...")
    # Initialize EasyOCR for English
    reader = easyocr.Reader(['en']) 

    # Load the image
    image_path = "receipt.jpg" # Make sure this matches your file name!
    img = cv2.imread(image_path)

    if img is None:
        print(f"Error: Could not find '{image_path}'. Check the spelling and location!")
        return

    # Convert to Grayscale
    # OCR models perform much better on black-and-white images because 
    # it removes confusing color data and heightens contrast.
    gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    print("Extracting text...")
    
    # Run the OCR
    # detail=0 tells EasyOCR we just want the raw text strings, not the bounding box coordinates
    results = reader.readtext(gray_img, detail=0) 

    # Print the raw results
    print("\n--- RAW OCR OUTPUT ---")
    raw_text = "\n".join(results)
    print(raw_text)
    print("----------------------")

if __name__ == "__main__":
    main()