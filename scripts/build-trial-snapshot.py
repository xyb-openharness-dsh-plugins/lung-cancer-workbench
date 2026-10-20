#!/usr/bin/env python3
"""Build the bundled lung-cancer trial snapshot from a date-bounded CTG API query.

Default window is the most recent 9 calendar months (maximum allowed: 12). Use
--input to rebuild from a saved ClinicalTrials.gov API v2 response offline.
"""
import argparse
import calendar
import json
import re
import sqlite3
import sys
import urllib.parse
import urllib.request
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path

API = "https://clinicaltrials.gov/api/v2/studies"
FIELDS = ",".join([
    "NCTId", "BriefTitle", "OfficialTitle", "OverallStatus", "StudyType", "Phase",
    "LeadSponsorName", "StudyFirstPostDate", "LastUpdatePostDate", "Condition",
    "InterventionType", "InterventionName", "EnrollmentCount", "StartDate",
    "LocationFacility", "LocationCity", "LocationCountry",
])


def subtract_months(day, months):
    month0 = day.month - 1 - months
    year = day.year + month0 // 12
    month = month0 % 12 + 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))


def fetch(args):
    start = subtract_months(args.as_of, args.months)
    params = {
        "format": "json", "query.cond": "lung cancer",
        "query.term": f"AREA[StudyFirstPostDate]RANGE[{start.isoformat()},{args.as_of.isoformat()}]",
        "pageSize": "1000", "countTotal": "true", "sort": "StudyFirstPostDate:desc", "fields": FIELDS,
    }
    all_studies, expected, token = [], None, None
    while True:
        page_params = dict(params)
        if token:
            page_params["pageToken"] = token
        request = urllib.request.Request(API + "?" + urllib.parse.urlencode(page_params), headers={"User-Agent": "XiaofeibaoTrialSnapshot/1.0"})
        with urllib.request.urlopen(request, timeout=60) as response:
            page = json.load(response)
        expected = page.get("totalCount", expected)
        all_studies.extend(page.get("studies", []))
        token = page.get("nextPageToken")
        if not token:
            break
    return {"totalCount": expected, "studies": all_studies}, start


def module(study, key):
    return study.get("protocolSection", {}).get(key, {})


def flatten_study(study, retrieved_at):
    ident = module(study, "identificationModule")
    status = module(study, "statusModule")
    design = module(study, "designModule")
    sponsor = module(study, "sponsorCollaboratorsModule").get("leadSponsor", {}).get("name")
    conditions = module(study, "conditionsModule").get("conditions", [])
    interventions = module(study, "armsInterventionsModule").get("interventions", [])
    locations = module(study, "contactsLocationsModule").get("locations", [])
    title = ident.get("briefTitle", "")
    search_text = " ".join([title, ident.get("officialTitle", ""), *conditions]).lower()
    nsclc = bool(re.search(r"\bnsclc\b|non[-\s]?small[-\s]?cell", search_text))
    sclc = bool(re.search(r"\bsclc\b|(?<!non[-\s])\bsmall[-\s]?cell(?:\s+lung)?", search_text))
    lung = bool(re.search(r"\blung\b.{0,45}\b(?:cancer|carcinoma|neoplasm|adenocarcinoma)\b|\bpulmonary\s+(?:cancer|carcinoma|neoplasm)\b", search_text))
    # Some records use only the common histology acronym in their registration fields.
    if not (nsclc or sclc or lung):
        return None
    histology = "Mixed" if nsclc and sclc else "NSCLC" if nsclc else "SCLC" if sclc else "Lung cancer / other"
    date_value = status.get("studyFirstPostDateStruct", {}).get("date")
    if not date_value:
        return None
    start = status.get("startDateStruct", {})
    enrollment = design.get("enrollmentInfo", {})
    source_record = {
        "nctId": ident.get("nctId"), "briefTitle": title,
        "officialTitle": ident.get("officialTitle"), "status": status.get("overallStatus"),
        "studyType": design.get("studyType"), "phases": design.get("phases", []),
        "leadSponsor": sponsor, "conditions": conditions,
        "firstPostDate": date_value,
        "lastUpdatePostDate": status.get("lastUpdatePostDateStruct", {}).get("date"),
        "startDate": start.get("date"), "startDateType": start.get("type"),
        "enrollment": enrollment.get("count"), "enrollmentType": enrollment.get("type"),
        "interventions": interventions, "locations": locations,
    }
    return {
        "nct_id": ident["nctId"], "title": title, "histology": histology,
        "phase": ", ".join(design.get("phases", [])) or None,
        "status": status.get("overallStatus"), "sponsor": sponsor,
        "start_date": start.get("date"), "start_date_type": start.get("type"),
        "first_post_date": date_value,
        "last_update": status.get("lastUpdatePostDateStruct", {}).get("date"),
        "interventions_json": json.dumps([item.get("name") for item in interventions if item.get("name")], ensure_ascii=False),
        "enrollment": enrollment.get("count"),
        "source_url": f"https://clinicaltrials.gov/study/{ident['nctId']}",
        "cohort": "first_post_9m", "retrieved_at": retrieved_at,
        "raw_record_json": json.dumps(source_record, ensure_ascii=False, separators=(",", ":")),
        "discovery_source": "ClinicalTrials.gov API v2",
        "discovery_url": "https://clinicaltrials.gov/search?cond=Lung%20Cancer",
        "study_type": design.get("studyType"),
        "conditions_json": json.dumps(conditions, ensure_ascii=False),
        "intervention_types_json": json.dumps([i.get("type") for i in interventions if i.get("type")], ensure_ascii=False),
        "locations_json": json.dumps([
            {k: location.get(k) for k in ("facility", "city", "country", "status") if location.get(k)}
            for location in locations
        ], ensure_ascii=False),
    }


def write_db(path, rows, metadata):
    temp = path.with_suffix(path.suffix + ".tmp")
    if temp.exists():
        temp.unlink()
    db = sqlite3.connect(temp)
    db.executescript("""
      PRAGMA journal_mode=DELETE;
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE trials (
        nct_id TEXT PRIMARY KEY, title TEXT NOT NULL, histology TEXT, phase TEXT, status TEXT,
        sponsor TEXT, start_date TEXT, start_date_type TEXT, first_post_date TEXT, last_update TEXT,
        interventions_json TEXT NOT NULL, enrollment INTEGER, source_url TEXT NOT NULL, cohort TEXT NOT NULL,
        retrieved_at TEXT NOT NULL, raw_record_json TEXT NOT NULL,
        discovery_source TEXT NOT NULL, discovery_url TEXT,
        study_type TEXT, conditions_json TEXT NOT NULL, intervention_types_json TEXT NOT NULL, locations_json TEXT NOT NULL
      );
      CREATE INDEX trials_histology_idx ON trials(histology);
      CREATE INDEX trials_posted_idx ON trials(first_post_date DESC);
      CREATE INDEX trials_status_idx ON trials(status);
      CREATE INDEX trials_sponsor_idx ON trials(sponsor);
    """)
    db.executemany("INSERT INTO metadata(key,value) VALUES(?,?)", [(k, str(v)) for k, v in metadata.items()])
    columns = list(rows[0].keys()) if rows else []
    placeholders = ",".join("?" for _ in columns)
    db.executemany(f"INSERT INTO trials({','.join(columns)}) VALUES({placeholders})", [tuple(row[c] for c in columns) for row in rows])
    db.commit()
    integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
    n_unique = db.execute("SELECT COUNT(DISTINCT nct_id) FROM trials").fetchone()[0]
    db.close()
    if integrity != "ok" or n_unique != len(rows):
        temp.unlink(missing_ok=True)
        raise RuntimeError(f"SQLite verification failed: integrity={integrity}, unique={n_unique}, rows={len(rows)}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="saved ClinicalTrials.gov API v2 JSON response; omits network access")
    parser.add_argument("--output", type=Path, default=Path("assets/data/lung-cancer-trials.sqlite"))
    parser.add_argument("--as-of", type=date.fromisoformat, default=date.today())
    parser.add_argument("--months", type=int, default=9, help="first-posted lookback, 1 to 12 months")
    args = parser.parse_args()
    if not 1 <= args.months <= 12:
        parser.error("--months must be between 1 and 12")
    start = subtract_months(args.as_of, args.months)
    dataset, _ = (json.load(args.input.open(encoding="utf-8")), start) if args.input else fetch(args)
    retrieved = args.as_of.isoformat()
    by_id = {}
    for study in dataset.get("studies", []):
        row = flatten_study(study, retrieved)
        if row and start.isoformat() <= row["first_post_date"] <= retrieved:
            by_id[row["nct_id"]] = row
    rows = list(by_id.values())
    hist = Counter(row["histology"] for row in rows)
    status = Counter(row["status"] or "Unknown" for row in rows)
    study_types = Counter(row["study_type"] or "Unknown" for row in rows)
    metadata = {
        "dataset_name": "Lung cancer trials first posted in the rolling 9-month window",
        "retrieved_date": retrieved, "window_start": start.isoformat(), "window_end": retrieved,
        "window_months": args.months, "registry": "ClinicalTrials.gov",
        "api_endpoint": API, "query_condition": "lung cancer",
        "query_date_field": "StudyFirstPostDate",
        "query_date_filter": f"AREA[StudyFirstPostDate]RANGE[{start.isoformat()},{retrieved}]",
        "api_total_count": dataset.get("totalCount", "unknown"),
        "api_returned_count": len(dataset.get("studies", [])),
        "lung_relevant_unique_count": len(rows), "record_count": len(rows),
        "excluded_unrelated_count": len(dataset.get("studies", [])) - len(rows),
        "histology_counts_json": json.dumps(hist, ensure_ascii=False, sort_keys=True),
        "status_counts_json": json.dumps(status, ensure_ascii=False, sort_keys=True),
        "study_type_counts_json": json.dumps(study_types, ensure_ascii=False, sort_keys=True),
        "completeness": "Complete paginated API response for the stated CTG query, then keyword-screened for lung cancer/SCLC/NSCLC relevance; not a global registry export and not coverage of other registries.",
        "selection_rule": "Include if registered title or condition contains NSCLC, non-small cell, SCLC, small-cell lung, lung cancer/carcinoma/neoplasm/adenocarcinoma or pulmonary cancer/carcinoma/neoplasm. This is a retrieval screen, not manual clinical eligibility review.",
        "source_overlap": "CTV is a discovery interface whose records are sourced from ClinicalTrials.gov; do not add it as an independent registry count.",
        "intended_use": "Research and visit discussion preparation only; not medical advice, treatment recommendation, or eligibility determination. Verify the current official record and site status.",
    }
    write_db(args.output, rows, metadata)
    print(json.dumps({"output": str(args.output), "apiTotalCount": dataset.get("totalCount"),
                      "apiReturned": len(dataset.get("studies", [])), "uniqueLungRelevant": len(rows),
                      "excluded": metadata["excluded_unrelated_count"], "histology": hist,
                      "status": status, "studyTypes": study_types, "window": [start.isoformat(), retrieved],
                      "integrityCheck": "ok"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, sqlite3.Error) as error:
        print(f"snapshot build failed: {error}", file=sys.stderr)
        raise
