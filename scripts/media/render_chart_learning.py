#!/usr/bin/env python3
"""Render local, authored chart geometry with the existing offline Pillow engine.

No provider, model, audio or publishing connection. Input is the repository-owned
manifest produced by generate-chart-learning.tsx, never an external user payload.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw
from capital_ai_media import _font, load_brand_palette

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/learning/charts"


def main():
    source = OUT / "manifest.json"
    payload = json.loads(source.read_text())
    palette = load_brand_palette()
    assets = []
    for asset in payload["assets"]:
        graphic = asset["graphic"]
        lower, upper = graphic["domain"]
        x = lambda index: 115 + index * 80
        y = lambda value: 480 - (value - lower) / (upper - lower) * 300
        image = Image.new("RGB", (1200, 675), palette.background)
        draw = ImageDraw.Draw(image)
        draw.text((60, 23), "CAPITAL-AI · CHART-LERNATLAS", font=_font(22, True), fill=palette.gold_light)
        draw.text((60, 62), graphic["title"], font=_font(34, True), fill=palette.text_primary)
        draw.text((60, 111), graphic["axis"], font=_font(21), fill=palette.text_secondary)
        for fraction in (0, .25, .5, .75, 1):
            value = lower + fraction * (upper - lower)
            draw.line((115, y(value), 1075, y(value)), fill="#334155")
            draw.text((95, y(value)), f"{value:g}", anchor="rm", font=_font(20), fill=palette.text_secondary)
        for index, guide in enumerate(graphic["guides"]):
            start, end = guide["from"], guide["to"]
            # Dashed guides remain visually distinct from solid primary data.
            for segment in range(40):
                a, b = segment / 40, min(1, (segment + .55) / 40)
                draw.line((x(start[0])+(x(end[0])-x(start[0]))*a, y(start[1])+(y(end[1])-y(start[1]))*a,
                           x(start[0])+(x(end[0])-x(start[0]))*b, y(start[1])+(y(end[1])-y(start[1]))*b), fill="#c4b5fd", width=3)
            draw.text((60+index*420, 545), f"{index+1}. {guide['label']}", font=_font(22), fill="#ddd6fe")
        for index, series in enumerate(graphic["series"]):
            color = ("#67e8f9", "#fcd34d")[index]
            points = [(x(i), y(value)) for i, value in enumerate(series["values"])]
            if series.get("dashed"):
                for start, end in zip(points, points[1:]):
                    for segment in range(8):
                        a, b = segment / 8, (segment + .55) / 8
                        draw.line((start[0]+(end[0]-start[0])*a,start[1]+(end[1]-start[1])*a,
                                   start[0]+(end[0]-start[0])*b,start[1]+(end[1]-start[1])*b), fill=color, width=4)
            else:
                draw.line(points, fill=color, width=5, joint="curve")
            draw.text((60+index*270, 505), series["label"], font=_font(22), fill=color)
        draw.text((1075, 500), "Zeit →", anchor="rt", font=_font(20), fill=palette.text_secondary)
        draw.text((60, 597), "Synthetisches Lernbeispiel · keine Live-Kurse · keine Anlageberatung", font=_font(20), fill=palette.text_primary)
        draw.text((60, 632), "Schematische Geometrie · keine berechneten Signale · capital-ai.online/learning", font=_font(19), fill=palette.text_secondary)
        target = OUT / f"{asset['id']}.png"
        image.save(target)
        assets.append({"id":asset["id"],"path":target.name,"sha256":hashlib.sha256(target.read_bytes()).hexdigest(),
                       "width":1200,"height":675,"mimeType":"image/png","state":"DRAFT"})
    (OUT / "png-manifest.json").write_text(json.dumps({"schemaVersion":"CAPITAL_AI_CHART_PNG@1",
        "sourceManifestSha256":hashlib.sha256(source.read_bytes()).hexdigest(),"publishReady":False,
        "renderer":"Pillow/offline","assets":assets}, indent=2)+"\n")
    print(f"Rendered {len(assets)} PNG chart cards.")


if __name__ == "__main__":
    main()
