from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import fitz
import tempfile
import os

app = FastAPI(title="PDF Text Extraction Service")


class ExtractRequest(BaseModel):
    fileUrl: str


@app.get("/")
def health():
    return {"status": "ok", "service": "pdf-text-extraction"}


@app.post("/extract")
def extract_pdf(request: ExtractRequest):
    try:
        response = requests.get(request.fileUrl, timeout=30)

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to download PDF. Status: {response.status_code}",
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        try:
            doc = fitz.open(tmp_path)
            pages = []

            for page_index, page in enumerate(doc):
                text = page.get_text("text")
                pages.append(f"\n\n--- PAGE {page_index + 1} ---\n\n{text}")

            doc.close()

            full_text = "\n".join(pages).strip()

            if not full_text:
                raise HTTPException(status_code=422, detail="No text extracted from PDF")

            return {
                "success": True,
                "text": full_text,
                "length": len(full_text),
                "pages": len(pages),
            }

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
