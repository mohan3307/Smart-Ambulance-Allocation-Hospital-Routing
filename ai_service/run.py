import uvicorn
import os
import sys

if __name__ == "__main__":
    # Add current directory to path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Smart Ambulance AI Microservice on http://0.0.0.0:{port} ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
