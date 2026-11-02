"""Deterministic weighted lead scoring. No randomness, no LLM."""
import os, re
THRESHOLDS = {"hot": int(os.getenv("HOT_MIN", 75)), "warm": int(os.getenv("WARM_MIN", 45))}
WEIGHTS = {"title": 20, "size": 15, "industry": 15, "requirement": 25, "source": 10, "completeness": 10, "contact": 5}
LABELS = {"title": "Job Title / Authority", "size": "Company Size", "industry": "Industry Relevance",
          "requirement": "Requirement / Business Need", "source": "Lead Source",
          "completeness": "Company Info Completeness", "contact": "Contact Validity"}
CORE = ["Software", "SaaS", "IT Services", "Fintech", "E-commerce", "Healthcare", "Manufacturing", "Telecom"]
ADJ = ["Education", "Retail", "Logistics", "Real Estate", "Consulting", "Banking", "Media", "Hospitality"]
SOURCES = {"referral": 10, "website": 9, "demo request": 10, "linkedin": 7, "event": 6, "webinar": 6,
           "email campaign": 4, "cold call": 3, "other": 2}
INTENT = ["looking for", "need", "want", "buy", "purchase", "implement", "demo", "quote", "pricing", "migrate", "replace", "evaluate"]
PRODUCT = ["crm", "software", "platform", "erp", "automation", "tool", "solution", "system"]
VAGUE = ["just browsing", "curious", "student", "internship", "job", "not sure", "research only"]
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
SITE = re.compile(r"^(https?://)?([\w-]+\.)+[a-z]{2,}(/.*)?$", re.I)
FIELDS = ["name", "company", "website", "job_title", "industry", "location", "size", "source", "requirement", "email", "phone"]

def s(v): return (v or "").strip()

def title(l):
    t = s(l.get("job_title")).lower()
    if not t: return 0, "Job title missing"
    if re.search(r"\b(founder|co-founder|ceo|cto|coo|cfo|owner|president|managing director|chief)\b", t): return 20, "Top decision maker"
    if re.search(r"\b(vp|vice president|director|head)\b", t): return 15, "Senior decision influencer"
    if "manager" in t: return 9, "Mid-level manager, limited authority"
    if re.search(r"\b(lead|senior|principal)\b", t): return 5, "Senior individual contributor"
    return 2, "Junior or unrecognised title"

def size(l):
    t = s(l.get("size")).replace(",", "")
    n = [int(x) for x in re.findall(r"\d+", t)]
    if not n: return 0, "Company size missing or unparseable"
    hi = max(n)
    for lim, p in [(1000, 15), (200, 13), (50, 11), (11, 7)]:
        if hi >= lim: return p, f"Company size up to {hi} employees"
    return 3, "Micro company (1-10 employees)"

def industry(l):
    i = s(l.get("industry")).lower()
    if not i: return 0, "Industry missing"
    if any(c.lower() == i for c in CORE): return 15, "Core target industry"
    if any(a.lower() == i for a in ADJ): return 8, "Adjacent industry"
    return 4, "Outside target industries"

def requirement(l):
    r = s(l.get("requirement")).lower()
    if not r: return 0, "No requirement stated"
    if any(v in r for v in VAGUE): return 3, "Low-intent or non-buyer requirement"
    p = 0
    if any(k in r for k in INTENT): p += 12
    if any(k in r for k in PRODUCT): p += 8
    if len(r.split()) >= 4: p += 5
    return min(p, 25), ("Clear buying intent" if p >= 20 else "Partial or vague need" if p else "Requirement has no recognisable need")

def source(l):
    k = s(l.get("source")).lower()
    if not k: return 0, "Lead source missing"
    return SOURCES.get(k, 2), f"Source: {l.get('source')}"

def completeness(l):
    p, miss = 0, []
    for f, pts, ok in [("company", 3, bool(s(l.get("company")))), ("website", 4, bool(SITE.match(s(l.get("website"))))),
                       ("location", 3, bool(s(l.get("location"))))]:
        if ok: p += pts
        else: miss.append(f)
    return p, ("Company info complete" if not miss else "Missing/invalid: " + ", ".join(miss))

def contact(l):
    p, miss = 0, []
    if EMAIL.match(s(l.get("email"))): p += 3
    else: miss.append("valid email")
    d = re.sub(r"\D", "", s(l.get("phone")))
    if 10 <= len(d) <= 15: p += 2
    else: miss.append("valid phone")
    return p, ("Contact details valid" if not miss else "Missing/invalid: " + ", ".join(miss))

RULES = {"title": title, "size": size, "industry": industry, "requirement": requirement,
         "source": source, "completeness": completeness, "contact": contact}

def classify(score):
    return "Hot" if score >= THRESHOLDS["hot"] else "Warm" if score >= THRESHOLDS["warm"] else "Cold"

def score_lead(lead):
    bd, pos, neg = [], [], []
    for k, fn in RULES.items():
        pts, note = fn(lead); mx = WEIGHTS[k]
        bd.append({"key": k, "category": LABELS[k], "points": pts, "max": mx, "note": note})
        (pos if pts / mx >= 0.6 else neg).append(f"{LABELS[k]}: {note} ({pts}/{mx})")
    total = sum(b["points"] for b in bd)
    filled = sum(1 for f in FIELDS if s(lead.get(f))) / len(FIELDS)
    valid = sum([bool(EMAIL.match(s(lead.get("email")))), 10 <= len(re.sub(r"\D", "", s(lead.get("phone")))) <= 15,
                 bool(SITE.match(s(lead.get("website"))))]) / 3
    conf = round(filled * 70 + valid * 30)
    cls = classify(total)
    action = {"Hot": "Contact within 24 hours with a personalised demo offer.",
              "Warm": "Add to nurture sequence and follow up within 3-5 days.",
              "Cold": "Add to low-priority email nurture; re-qualify later."}[cls]
    if conf < 55: action += " Verify missing or invalid details first."
    quality = {"Hot": "High-potential lead with strong fit and intent.",
               "Warm": "Moderate-fit lead that needs qualification.",
               "Cold": "Low-fit or low-information lead."}[cls]
    expl = f"Score {total}/100 = " + " + ".join(f"{b['points']} ({b['category']})" for b in bd) + f". Classified {cls} (Hot >= {THRESHOLDS['hot']}, Warm >= {THRESHOLDS['warm']})."
    return {"score": total, "classification": cls, "quality": quality, "breakdown": bd, "positive": pos, "negative": neg,
            "explanation": expl, "confidence": conf, "confidence_level": "High" if conf >= 80 else "Medium" if conf >= 55 else "Low",
            "next_action": action}
