"""Measure the character boxes on the blank NaTIS RLV and NCO forms.

Writes src/utils/paperwork/layouts/{rlv,nco}.js: for every field we fill,
the page index and the [x0, x1] span of each box (PDF points, y measured
from the top of the page). Run it again only if public/forms/*.pdf change:

    python scripts/measure-natis-forms.py

Needs PyMuPDF (pip install pymupdf).

The forms draw every box wall as a thin filled rectangle, so:
  - cells   = consecutive vertical walls on one row that share a top and
              bottom border (the "-" between phone code and number, and the
              gap before a postal code, have no border and split the run)
  - marks   = the box enclosing an option label ("RSA ID", "male", ...)
  - dates   = two digit slots per printed ":" (one either side); a box
              pre-printed "2:0" is skipped
"""
import collections
import json
import pathlib
import fitz

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "utils" / "paperwork" / "layouts"


def walls(page):
    v, h = [], []
    for g in page.get_drawings():
        for it in g["items"]:
            if it[0] != "re":
                continue
            r = it[1]
            if r.width < 1.6 and r.height > 4:
                v.append(r)
            elif r.height < 1.6 and r.width > 4:
                h.append(r)
    return v, h


def bordered(h, x0, x1, y):
    """True if horizontal segments on row y (merged where they touch) cover x0..x1."""
    reach = x0 + 1
    for r in sorted((r for r in h if abs((r.y0 + r.y1) / 2 - y) < 1.2), key=lambda r: r.x0):
        if r.x0 <= reach + 0.5:
            reach = max(reach, r.x1)
    return reach >= x1 - 1


def cell_runs(page):
    v, h = walls(page)
    rows = collections.defaultdict(list)
    for r in v:
        if 6 < r.height < 22:
            rows[(round(r.y0), round(r.y1))].append(r)
    runs = []
    for rs in rows.values():
        top = min(r.y0 for r in rs)
        bottom = max(r.y1 for r in rs)
        xs = sorted(set(round((r.x0 + r.x1) / 2, 2) for r in rs))
        cur = []
        for a, b in zip(xs, xs[1:]):
            if b - a <= 16 and bordered(h, a, b, top + 0.5) and bordered(h, a, b, bottom - 0.5):
                cur.append([a, b])
            else:
                if cur:
                    runs.append({"top": top, "bottom": bottom, "cells": cur})
                cur = []
        if cur:
            runs.append({"top": top, "bottom": bottom, "cells": cur})
    return runs


def cells(page, top, x0):
    """The run whose top border and first wall are within 1pt of (top, x0)."""
    hits = [r for r in cell_runs(page) if abs(r["top"] - top) < 1 and abs(r["cells"][0][0] - x0) < 1]
    assert len(hits) == 1, f"cells({page.number}, {top}, {x0}) matched {len(hits)} runs"
    return {"page": page.number, **hits[0]}


def mark(page, word, x, y):
    """The box enclosing the option label `word` printed near (x, y)."""
    hits = [w for w in page.get_text("words") if w[4] == word and abs(w[0] - x) < 3 and abs(w[1] - y) < 3]
    assert len(hits) == 1, f"mark({page.number}, {word!r}, {x}, {y}) matched {len(hits)} words"
    w = hits[0]
    return box_around(page, (w[0] + w[2]) / 2, (w[1] + w[3]) / 2)


def box_around(page, cx, cy):
    v, h = walls(page)
    left = max(r.x1 for r in v if r.x1 <= cx and r.y0 <= cy <= r.y1)
    right = min(r.x0 for r in v if r.x0 >= cx and r.y0 <= cy <= r.y1)
    top = max(r.y1 for r in h if r.y1 <= cy and r.x0 <= cx <= r.x1)
    bottom = min(r.y0 for r in h if r.y0 >= cy and r.x0 <= cx <= r.x1)
    return {"page": page.number, "top": top, "bottom": bottom, "cells": [[left, right]]}


def date(page, y):
    """Digit slots of the date group whose ":" glyphs sit on row y (top of glyph)."""
    v, _ = walls(page)
    glyphs = sorted((w for w in page.get_text("words") if w[4] in (":", "2:0") and abs(w[1] - y) < 2), key=lambda w: w[0])
    assert len(glyphs) == 4, f"date({page.number}, {y}) found {len(glyphs)} colon groups"
    slots, top, bottom = [], None, None
    for w in glyphs:
        if w[4] == "2:0":
            continue
        cx, cy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        # The divider inside a 4-digit year is a short tick that doesn't reach
        # the glyph's centre line, so match any wall overlapping the row.
        row = [r for r in v if r.y1 > cy - 8 and r.y0 < cy + 8]
        left = max((r for r in row if r.x1 <= cx), key=lambda r: r.x1)
        right = min((r for r in row if r.x0 >= cx), key=lambda r: r.x0)
        slots += [[round((left.x0 + left.x1) / 2, 2), round(cx, 2)], [round(cx, 2), round((right.x0 + right.x1) / 2, 2)]]
        top = min(r.y0 for r in (left, right)) if top is None else min(top, left.y0, right.y0)
        bottom = max(r.y1 for r in (left, right)) if bottom is None else max(bottom, left.y1, right.y1)
    return {"page": page.number, "top": top, "bottom": bottom, "cells": slots}


def rlv(doc):
    p0, p1, p2, p3 = doc[0], doc[1], doc[2], doc[3]
    return {
        "tx.titleHolder": box_around(p0, 239, 184),
        # ---- Part A: title holder (page 1)
        "A.idType.traffic_register": mark(p0, "traffic", 178, 253),
        "A.idType.rsa_id": mark(p0, "RSA", 255, 253),
        "A.idType.foreign_id": mark(p0, "foreign", 291, 253),
        "A.idType.business_reg": mark(p0, "business", 354, 253),
        "A.idNumber": cells(p0, 280.02, 214.14),
        "A.nature.male": mark(p0, "male", 142, 323),
        "A.nature.female": mark(p0, "female", 184, 323),
        "A.nature.one_man": mark(p0, "one-man", 232, 323),
        "A.nature.private_company": mark(p0, "private", 307, 323),
        "A.nature.close_corporation": mark(p0, "close", 384, 323),
        "A.nature.other": mark(p0, "other", 142, 341),
        "A.natureOther": cells(p0, 340.8, 229.98),
        "A.surname": cells(p0, 365.7, 95.16),
        "A.initials": cells(p0, 385.5, 144.9),
        "A.firstNames": cells(p0, 385.5, 210.48),
        "A.dob": date(p0, 417),
        "A.email": cells(p0, 441.36, 104.58),
        "A.dayCode": cells(p0, 492.96, 203.52),
        "A.dayNumber": cells(p0, 492.96, 281.4),
        "A.faxCode": cells(p0, 524.76, 203.52),
        "A.faxNumber": cells(p0, 524.76, 281.4),
        "A.cell": cells(p0, 556.56, 228.36),
        "A.postal1": cells(p0, 576.36, 108.6),
        "A.postal2": cells(p0, 590.52, 108.6),
        "A.postal3": cells(p0, 604.68, 108.6),
        "A.postalSuburb": cells(p0, 618.84, 108.6),
        "A.postalCity": cells(p0, 633.0, 108.6),
        "A.postalCode": cells(p0, 633.0, 439.32),
        "A.street1": cells(p0, 658.5, 108.54),
        "A.street2": cells(p0, 672.66, 108.54),
        "A.street3": cells(p0, 686.82, 108.54),
        "A.streetSuburb": cells(p0, 700.98, 108.54),
        "A.streetCity": cells(p0, 715.14, 108.54),
        "A.streetCode": cells(p0, 715.14, 439.26),
        "A.notices.postal": mark(p0, "postal", 232, 741),
        "A.notices.street": mark(p0, "street", 300, 741),
        # ---- Part A: organisation's proxy (page 2 top)
        "A.proxy.idType.traffic_register": mark(p1, "traffic", 214, 42),
        "A.proxy.idType.rsa_id": mark(p1, "RSA", 291, 42),
        "A.proxy.idType.foreign_id": mark(p1, "foreign", 327, 42),
        "A.proxy.idNumber": cells(p1, 68.4, 214.14),
        "A.proxy.surname": cells(p1, 108.0, 98.1),
        "A.proxy.initials": cells(p1, 108.0, 468.42),
        # ---- Part B: owner (page 2 bottom, street address on page 3)
        "B.idType.traffic_register": mark(p1, "traffic", 178, 429),
        "B.idType.rsa_id": mark(p1, "RSA", 255, 429),
        "B.idType.foreign_id": mark(p1, "foreign", 291, 429),
        "B.idType.business_reg": mark(p1, "business", 354, 429),
        "B.idNumber": cells(p1, 456.36, 214.92),
        "B.nature.male": mark(p1, "male", 142, 498),
        "B.nature.female": mark(p1, "female", 184, 498),
        "B.nature.one_man": mark(p1, "one-man", 232, 498),
        "B.nature.private_company": mark(p1, "private", 307, 498),
        "B.nature.close_corporation": mark(p1, "close", 384, 498),
        "B.surname": cells(p1, 544.14, 95.16),
        "B.initials": cells(p1, 563.94, 144.9),
        "B.firstNames": cells(p1, 563.94, 210.48),
        "B.dob": date(p1, 593),
        "B.email": cells(p1, 619.26, 104.58),
        "B.dayCode": cells(p1, 664.56, 203.52),
        "B.dayNumber": cells(p1, 664.56, 281.4),
        "B.faxCode": cells(p1, 690.06, 203.52),
        "B.faxNumber": cells(p1, 690.06, 281.4),
        "B.cell": cells(p1, 715.56, 227.52),
        "B.postal1": cells(p1, 735.36, 108.6),
        "B.postal2": cells(p1, 749.52, 108.6),
        "B.postal3": cells(p1, 763.68, 108.6),
        "B.postalSuburb": cells(p1, 777.84, 108.6),
        "B.postalCity": cells(p1, 792.0, 108.6),
        "B.postalCode": cells(p1, 792.0, 439.32),
        "B.street1": cells(p2, 18.0, 108.54),
        "B.street2": cells(p2, 32.16, 108.54),
        "B.street3": cells(p2, 46.32, 108.54),
        "B.streetSuburb": cells(p2, 60.48, 108.54),
        "B.streetCity": cells(p2, 74.64, 108.54),
        "B.streetCode": cells(p2, 74.64, 439.26),
        "B.notices.postal": mark(p2, "postal", 232, 99),
        "B.notices.street": mark(p2, "street", 300, 99),
        # ---- Part C: motor vehicle (page 3 bottom, page 4)
        "C.licence": cells(p2, 543.36, 181.5),
        "C.registerNo": cells(p2, 568.8, 252.66),
        "C.vin": cells(p2, 591.48, 192.12),
        "C.make": cells(p2, 612.18, 106.8),
        "C.series": cells(p2, 632.88, 128.04),
        "C.driven.self_propelled": mark(p2, "self-propelled", 151, 781),
        "C.description.sedan": mark(p3, "sedan", 147, 21),
        "C.description.hatch_back": mark(p3, "hatch", 242, 21),
        "C.description.pick_up": mark(p3, "pick-up", 299, 21),
        "C.engine": cells(p3, 63.06, 213.24),
        "C.transmission.manual": mark(p3, "manual", 232, 152),
        "C.transmission.automatic": mark(p3, "automatic", 336, 152),
        "C.colour.white": mark(p3, "white", 145, 178),
        "C.colour.red": mark(p3, "red", 172, 178),
        "C.colour.blue": mark(p3, "blue", 201, 178),
        "C.colour.other": mark(p3, "other", 229, 178),
        "C.colourOther": cells(p3, 175.26, 307.26),
        "C.odometer": cells(p3, 292.74, 288.48),
        "C.kept1": cells(p3, 349.68, 112.44),
        "C.kept2": cells(p3, 363.84, 112.44),
        "C.kept3": cells(p3, 378.0, 112.44),
        "C.keptSuburb": cells(p3, 392.16, 112.44),
        "C.keptCity": cells(p3, 406.32, 112.44),
        "C.keptCode": cells(p3, 406.32, 432.48),
        "C.dateLiable": date(p3, 437),
        "C.reason.ownership": mark(p3, "ownership", 246, 516),
    }


def nco(doc):
    p0, p1, p2 = doc[0], doc[1], doc[2]
    return {
        # ---- Part A: seller (page 1)
        "A.idType.traffic_register": mark(p0, "traffic", 183, 339),
        "A.idType.rsa_id": mark(p0, "RSA", 256, 339),
        "A.idType.foreign_id": mark(p0, "foreign", 292, 339),
        "A.idType.business_reg": mark(p0, "business", 350, 339),
        "A.idNumber": cells(p0, 365.76, 214.14),
        "A.surname": cells(p0, 408.24, 95.16),
        "A.initials": cells(p0, 408.24, 469.26),
        "A.email": cells(p0, 436.56, 104.58),
        "A.dayCode": cells(p0, 456.36, 203.52),
        "A.dayNumber": cells(p0, 456.36, 281.4),
        # ---- Part B: buyer (page 2)
        "B.idType.traffic_register": mark(p1, "traffic", 178, 44),
        "B.idType.rsa_id": mark(p1, "RSA", 255, 44),
        "B.idType.foreign_id": mark(p1, "foreign", 291, 44),
        "B.idType.business_reg": mark(p1, "business", 354, 44),
        "B.idNumber": cells(p1, 70.2, 214.92),
        "B.surname": cells(p1, 112.8, 95.16),
        "B.initials": cells(p1, 112.8, 469.26),
        "B.email": cells(p1, 141.24, 104.58),
        "B.postal1": cells(p1, 161.1, 104.58),
        "B.postal2": cells(p1, 175.32, 104.58),
        "B.postal3": cells(p1, 189.48, 104.58),
        "B.postalSuburb": cells(p1, 203.64, 104.58),
        "B.postalCity": cells(p1, 217.86, 104.58),
        "B.postalCode": cells(p1, 217.86, 451.26),
        "B.street1": cells(p1, 246.3, 104.58),
        "B.street2": cells(p1, 260.46, 104.58),
        "B.street3": cells(p1, 274.62, 104.58),
        "B.streetSuburb": cells(p1, 288.84, 104.58),
        "B.streetCity": cells(p1, 303.0, 104.58),
        "B.streetCode": cells(p1, 303.0, 451.26),
        "B.notices.postal": mark(p1, "postal", 226, 338),
        "B.notices.street": mark(p1, "street", 291, 338),
        "B.dayCode": cells(p1, 371.1, 203.52),
        "B.dayNumber": cells(p1, 371.1, 281.4),
        "B.proxy.idType.traffic_register": mark(p1, "traffic", 214, 434),
        "B.proxy.idType.rsa_id": mark(p1, "RSA", 291, 434),
        "B.proxy.idType.foreign_id": mark(p1, "foreign", 327, 434),
        "B.proxy.idNumber": cells(p1, 460.14, 214.92),
        "B.proxy.surname": cells(p1, 502.62, 99.72),
        "B.proxy.initials": cells(p1, 502.62, 470.58),
        # ---- Part C: motor vehicle (page 3)
        "C.licence": cells(p2, 41.88, 181.5),
        "C.registerNo": cells(p2, 67.32, 252.66),
        "C.vin": cells(p2, 87.12, 192.12),
        "C.make": cells(p2, 106.98, 106.8),
        "C.odometer": cells(p2, 126.84, 286.86),
        "C.reason.sold": mark(p2, "sold", 209, 159),
        "C.dateOfChange": date(p2, 192),
    }


def write(name, fields, source):
    def rnd(f):
        return {
            "page": f["page"],
            "top": round(f["top"], 2),
            "bottom": round(f["bottom"], 2),
            "cells": [[round(a, 2), round(b, 2)] for a, b in f["cells"]],
        }

    body = ",\n".join(f"    {json.dumps(k)}: {json.dumps(rnd(v))}" for k, v in fields.items())
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}.js").write_text(
        f"// Generated by scripts/measure-natis-forms.py from {source}. Do not edit by hand.\n"
        f"// Coordinates are PDF points with y measured from the top of the page.\n"
        f"const LAYOUT = {{\n{body},\n}};\n\nexport default LAYOUT;\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"{name}.js: {len(fields)} fields")


if __name__ == "__main__":
    for name, source, build in (("rlv", "public/forms/rlv.pdf", rlv), ("nco", "public/forms/nco.pdf", nco)):
        doc = fitz.open(ROOT / source)
        write(name, build(doc), source)
