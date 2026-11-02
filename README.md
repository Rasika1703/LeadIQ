# LeadIQ - AI-Based Lead Scoring System
Deterministic, explainable lead scoring (FastAPI + single-page UI, optional MongoDB).

## Setup
```
cd backend && pip install -r requirements.txt
# optional: export MONGO_URI=mongodb://localhost:27017  HOT_MIN=75 WARM_MIN=45
uvicorn main:app --reload      # open http://localhost:8000
python tests.py                # run scoring test cases
```
Without MONGO_URI the app uses in-memory storage seeded with 3 sample leads (tagged "Sample").

## Architecture
`scoring.py` rule engine (no LLM, no randomness) | `tests.py` test scenarios | `main.py` API + storage | `static/index.html` UI.

## Scoring (100 pts)
Title 20, Company size 15, Industry 15, Requirement 25, Source 10, Company info 10, Contact validity 5.
Hot >= 75, Warm >= 45, Cold below. Confidence = 70% field completeness + 30% email/phone/website validity.
Full rules: see the Scoring Methodology page (served from the same constants used by the engine).

## API
POST /api/leads | GET /api/leads | GET/PUT/DELETE /api/leads/{id} | GET /api/stats | GET /api/methodology | GET /api/tests

## Not yet included
LLM explanation service (hook: pass `score_lead()` output to Gemini/OpenAI and return wording only).
