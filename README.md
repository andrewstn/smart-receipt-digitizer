# ReceiptAI — Full-Stack AI Receipt Digitizer

ReceiptAI is a production-ready SaaS application that processes receipt images, extracts unstructured financial data using Gemini AI, normalizes it via Pydantic, and provides comprehensive expense tracking and analytics.

The architecture is built for performance and security, featuring cryptographically signed JWT authentication, optimized SQL aggregations, backend pagination, and a multi-stage Docker deployment.

## Key Features & Architecture Highlights

* **AI Extraction Engine:** Integrates the modern `google-genai` SDK (`gemini-2.5-flash`) to parse unstructured image data into structured JSON with dual-layer validation (Pydantic + LLM structured schema configurations).
* **Production-Grade Security:** Implements JWT-based authentication via FastAPI Security utilities to block anonymous access and lock down CRUD endpoints.
* **SQL-Driven Analytics:** Donut and bar chart dashboards utilizing high-performance SQLAlchemy aggregations (`func.sum`, `group_by`) computed entirely at the database engine level.
* **Optimized Performance:** Implements backend-driven offset pagination (`skip`, `limit`) and an interactive infinite-scroll/load-more frontend mechanism to prevent DOM bottlenecking.
* **DevOps Ready (Multi-Stage Docker):** Frontend utilizes a multi-stage Docker build to discard bulky Node environments, serving minified static files via an Nginx web server mapped to port `5173`.
* **One-Click Recruiter Demo:** A pre-configured database seeder endpoint that instantly populates 15 mathematically synchronized receipts to allow immediate interface evaluation.

---

## Tech Stack

* **Frontend:** React (Vite), Tailwind CSS, Recharts, React Hot Toast
* **Backend:** FastAPI, Uvicorn, SQLAlchemy, Pydantic v2, PyJWT
* **Database:** SQLite (Persistent Volume Mapping)
* **Infrastructure:** Docker, Docker Compose, Nginx

---

## Quick Start (Docker Deployment)

The entire application is containerized to guarantee it runs identically on any system without local Node or Python installations.

### 1. Prerequisites

Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and active on your machine.

### 2. Set Environment Variables

Create a `.env` file in the **root** project directory and add your Google Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Launch the Stack

Run the following orchestrator command from the root folder:

```bash
docker-compose up --build
```

Once the compilation completes, open your browser and navigate to:

* **Frontend Interface:** [http://localhost:5173](http://localhost:5173)

* **Interactive API Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

## Demo Credentials

To bypass manually capturing receipt photos, use the integrated One-Click Demo Mode button on the sign-in screen, or authenticate using the mock credentials below:

* **Username:** demo

* **Password:** password
