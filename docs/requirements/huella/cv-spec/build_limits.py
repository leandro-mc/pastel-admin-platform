#!/usr/bin/env python3
"""
Huella · CV limits — generator and verifier.

Models a page as a budget of "line units" (LU): 1 LU = one line of body text
including its leading. Every element has a hard character cap; every section
has an LU budget; the sum of section budgets (worst case: ALL sections at their
hard maximum simultaneously) must fit the page capacity.

Run:  python3 build_limits.py     -> verifies and writes limits.json
Exit code != 0 if any level can overflow its page budget in the worst case.

NOTE: character caps are a cheap pre-filter. The ground truth is always the
rendered PDF (page count read from the compiler) -> see "Fit Ladder" in the spec.
"""
import json, math, sys

AVG_CHAR_EM = 0.52     # conservative average glyph width (em) for a humanist sans
LINE_HEIGHT = 1.22     # leading factor
SAFETY = 0.91          # keep ~9% of the page for heading air and rounding
PAGES = {"letter": (8.5, 11.0), "a4": (8.27, 11.69)}
MARGIN_X_IN, MARGIN_Y_IN = 0.70, 0.60
BULLET_INDENT_PT = 14


def cpl(page, font_pt, indent_pt=0):
    w_in, _ = PAGES[page]
    width_pt = (w_in - 2 * MARGIN_X_IN) * 72 - indent_pt
    return int(width_pt // (font_pt * AVG_CHAR_EM))


def capacity_lu(page, font_pt):
    _, h_in = PAGES[page]
    height_pt = (h_in - 2 * MARGIN_Y_IN) * 72
    return int((height_pt / (font_pt * LINE_HEIGHT)) * SAFETY)


L = lambda chars, per: math.ceil(chars / per)

# bullet lines allowed per experience entry, by recency rank (0 = most recent)
LEVELS = {
    "junior": dict(
        label="Junior (0-3 años)", pages=1, font=10.5,
        summary_chars=270, skills_groups=4, skills_group_chars=90, skills_total=22,
        entries=3, entry_bullet_lines=[5, 3, 0], bullet_max=170, bullet_ideal=(90, 150), bullet_min=55,
        projects=2, project_bullet_lines=[2, 2], project_title_chars=86,
        education=2, education_detail_lines=[1, 0], education_detail_chars=90, extras_lines=2, certs=2,
    ),
    "mid": dict(
        label="Mid-level (3-8 años)", pages=2, font=10.5,
        summary_chars=270, skills_groups=5, skills_group_chars=180, skills_total=30,
        entries=5, entry_bullet_lines=[9, 8, 6, 4, 2], bullet_max=175, bullet_ideal=(95, 160), bullet_min=60,
        projects=2, project_bullet_lines=[3, 3], project_title_chars=86,
        education=2, education_detail_lines=[1, 0], education_detail_chars=90, extras_lines=5, certs=4,
    ),
    "senior": dict(
        label="Senior (8+ años)", pages=2, font=10.0,
        summary_chars=380, skills_groups=6, skills_group_chars=180, skills_total=38,
        entries=6, entry_bullet_lines=[11, 9, 7, 5, 3, 0], bullet_max=180, bullet_ideal=(100, 165), bullet_min=65,
        projects=1, project_bullet_lines=[3], project_title_chars=86,
        education=2, education_detail_lines=[0, 0], education_detail_chars=90, extras_lines=6, certs=5,
    ),
}
FIXED = dict(name_max=40, headline_max=70, role_company_max=68, location_max=30,
             date_range_max=24, link_label_max=40, group_label_max=24, skill_item_max=28,
             contact_items_max=5, contact_chars_max=180)
# header = name(2) + headline(1) + contact up to 2 lines(2) + gap(0.5)  <- finding from the real render
SECTION_HEADING_LU, ENTRY_HEADER_LU, HEADER_BLOCK_LU, PAGE_BREAK_LOSS_LU = 2.0, 1.5, 5.5, 3


def evaluate(name, p, page):
    c_full = cpl(page, p["font"])
    c_bul = cpl(page, p["font"], BULLET_INDENT_PT)
    cap = capacity_lu(page, p["font"]) * p["pages"] - PAGE_BREAK_LOSS_LU * (p["pages"] - 1)
    s = {"header": HEADER_BLOCK_LU,
         "summary": SECTION_HEADING_LU + L(p["summary_chars"], c_full),
         "skills": SECTION_HEADING_LU + p["skills_groups"] * L(p["skills_group_chars"], c_full),
         "experience": SECTION_HEADING_LU + sum(
             ENTRY_HEADER_LU + ln for ln in p["entry_bullet_lines"][:p["entries"]]),
         "projects": (SECTION_HEADING_LU + sum(
             ENTRY_HEADER_LU + ln for ln in p["project_bullet_lines"][:p["projects"]])) if p["projects"] else 0,
         "education": SECTION_HEADING_LU + sum(
             ENTRY_HEADER_LU + d * L(p["education_detail_chars"], c_full)
             for d in p["education_detail_lines"][:p["education"]]),
         "extras": SECTION_HEADING_LU + p["extras_lines"]}
    total = sum(s.values())
    assert L(p["bullet_max"], c_bul) <= 2, f"{name}/{page}: bullet_max exceeds 2 lines ({c_bul} cpl)"
    return dict(cpl_full=c_full, cpl_bullet=c_bul, capacity_lu=cap, sections_lu=s,
                worst_case_lu=round(total, 1), slack_lu=round(cap - total, 1))


def main():
    out = {"_meta": dict(avg_char_em=AVG_CHAR_EM, line_height=LINE_HEIGHT, safety=SAFETY,
                         margins_in=[MARGIN_X_IN, MARGIN_Y_IN], fixed=FIXED,
                         note="Worst case = every section at its hard maximum at the same time.")}
    ok = True
    print(f"{'level':8}{'page':7}{'cpl':>5}{'bul':>5}{'cap':>6}{'worst':>7}{'slack':>7}  sections")
    for page in PAGES:
        for name, p in LEVELS.items():
            r = evaluate(name, p, page)
            out.setdefault(page, {})[name] = {**p, **r}
            ok &= r["slack_lu"] >= 0
            print(f"{name:8}{page:7}{r['cpl_full']:>5}{r['cpl_bullet']:>5}{r['capacity_lu']:>6}"
                  f"{r['worst_case_lu']:>7}{r['slack_lu']:>7}  {'OK ' if r['slack_lu'] >= 0 else 'OVR'} {r['sections_lu']}")
    with open("limits.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("\nlimits.json written." if ok else "\nFAIL: some level can overflow - adjust LEVELS.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
