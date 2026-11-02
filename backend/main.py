import os, uuid, datetime as dt
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import scoring, tests

class Lead(BaseModel):
    name: str = Field(min_length=2); company: str = Field(min_length=1)
    website: Optional[str] = ""; job_title: Optional[str] = ""; industry: Optional[str] = ""
    location: Optional[str] = ""; size: Optional[str] = ""; source: Optional[str] = ""
    requirement: Optional[str] = ""; email: Optional[str] = ""; phone: Optional[str] = ""

class Repo:
    """MongoDB when MONGO_URI is set, otherwise in-memory (seeded)."""
    def __init__(self):
        uri = os.getenv("MONGO_URI")
        self.col = None
        if uri:
            from pymongo import MongoClient
            self.col = MongoClient(uri)[os.getenv("MONGO_DB", "leadiq")]["leads"]
        self.mem = {}
        if not (self.col is not None and self.col.count_documents({})): self.seed()
    def seed(self):
        S = [("Priya Nair","Finlytics","Fintech","CEO","200-500","Referral","Need a CRM demo and pricing","priya@finlytics.io","+91 9811122233","finlytics.io","Mumbai"),
             ("Amit Verma","EduBridge","Education","Marketing Manager","20","Webinar","Need a tool for tracking","amit@edubridge.in","+91 9822233344","edubridge.in","Pune"),
             ("Karan Shah","GreenFarm","Agriculture","Intern","5","Cold Call","just browsing","karan@@mail","","","")]
        for n,c,i,t,z,so,r,e,p,w,lo in S:
            self.save(dict(name=n,company=c,industry=i,job_title=t,size=z,source=so,requirement=r,email=e,phone=p,website=w,location=lo), sample=True)
    def save(self, d, sample=False, id=None, created=None):
        res = scoring.score_lead(d)
        doc = {**d, "id": id or uuid.uuid4().hex[:10], "is_sample": sample, "created_at": created or dt.datetime.utcnow().isoformat(), "result": res}
        if self.col is not None: self.col.replace_one({"id": doc["id"]}, doc, upsert=True)
        else: self.mem[doc["id"]] = doc
        return doc
    def all(self):
        docs = [{k: v for k, v in x.items() if k != "_id"} for x in (self.col.find() if self.col is not None else self.mem.values())]
        return sorted(docs, key=lambda x: x["created_at"], reverse=True)
    def get(self, i): return next((x for x in self.all() if x["id"] == i), None)
    def delete(self, i):
        if self.col is not None: self.col.delete_one({"id": i})
        else: self.mem.pop(i, None)

app, repo = FastAPI(title="LeadIQ"), Repo()

@app.post("/api/leads")
def create(l: Lead): return repo.save(l.model_dump())
@app.get("/api/leads")
def list_(): return repo.all()
@app.get("/api/leads/{i}")
def get(i: str):
    d = repo.get(i)
    if not d: raise HTTPException(404, "Lead not found")
    return d
@app.put("/api/leads/{i}")
def update(i: str, l: Lead):
    d = repo.get(i)
    if not d: raise HTTPException(404, "Lead not found")
    return repo.save(l.model_dump(), d["is_sample"], i, d["created_at"])
@app.delete("/api/leads/{i}")
def delete(i: str): repo.delete(i); return {"ok": True}
@app.get("/api/stats")
def stats():
    a = repo.all(); c = lambda k: sum(1 for x in a if x["result"]["classification"] == k)
    return {"total": len(a), "hot": c("Hot"), "warm": c("Warm"), "cold": c("Cold"),
            "avg": round(sum(x["result"]["score"] for x in a) / len(a), 1) if a else 0}
@app.get("/api/methodology")
def meth():
    return {"weights": scoring.WEIGHTS, "labels": scoring.LABELS, "thresholds": scoring.THRESHOLDS,
            "core_industries": scoring.CORE, "adjacent_industries": scoring.ADJ, "sources": scoring.SOURCES}
@app.get("/api/tests")
def run_tests(): return tests.run()
app.mount("/", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "..", "static"), html=True))
