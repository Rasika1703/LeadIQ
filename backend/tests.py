from scoring import score_lead
BASE = dict(name="Rahul Sharma", company="ABC Technologies", website="www.abctechnologies.com", job_title="Founder",
            industry="IT Services", location="Bangalore", size="50-100 Employees", source="Website",
            requirement="Looking for CRM software", email="rahul@example.com", phone="+91 9876543210")
CASES = [
 ("High-quality lead", "Founder, core industry, clear intent, full data", BASE, "Hot"),
 ("Medium-quality lead", "Manager, adjacent industry, small firm", {**BASE, "job_title": "Marketing Manager", "industry": "Education", "size": "20", "source": "Webinar", "requirement": "Need a tool for tracking"}, "Warm"),
 ("Low-quality lead", "Intern, vague interest, cold call", {**BASE, "job_title": "Intern", "industry": "Agriculture", "size": "5", "source": "Cold Call", "requirement": "just browsing"}, "Cold"),
 ("Missing company information", "No website, location or size", {**BASE, "website": "", "location": "", "size": ""}, None),
 ("Invalid email", "Malformed email address", {**BASE, "email": "rahul@@bad"}, None),
 ("Incomplete contact details", "No email or phone", {**BASE, "email": "", "phone": ""}, None),
]
def run():
    out = []
    base = score_lead(BASE)["score"]
    for n, c, l, exp in CASES:
        r = score_lead(l); ok = (r["classification"] == exp) if exp else r["score"] < base
        out.append({"name": n, "condition": c, "expected": exp or f"Score below {base}", "actual": f"{r['score']} ({r['classification']})", "status": "Pass" if ok else "Fail"})
    a, b = score_lead(BASE), score_lead(dict(BASE))
    out.append({"name": "Identical inputs", "condition": "Same lead scored twice", "expected": "Identical results", "actual": f"{a['score']} vs {b['score']}", "status": "Pass" if a == b else "Fail"})
    return out
if __name__ == "__main__":
    for t in run(): print(t)
