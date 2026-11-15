#!/usr/bin/env python3
"""Regression checks for first-party seven-colour CAPITAL-AI Universe assets."""
from __future__ import annotations

import copy
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from capital_ai_media import (
    DEFAULT_TOKEN_PATH, MediaRenderError, RenderScene,
    load_brand_palette, render_brand_card, render_scene_frame,
)

REPO = Path(__file__).resolve().parents[2]
FAMILIES = ("cyan", "violet", "gold", "pink", "rose", "blue", "green")


class UniverseBrandTests(unittest.TestCase):
    def test_canonical_seven_colors_agree_with_hub(self):
        colors = load_brand_palette().universe_colors
        self.assertEqual(len(colors), 7)
        hub = (REPO / "shared" / "hub-branding.mjs").read_text(encoding="utf-8")
        for name, actual in zip(FAMILIES, colors):
            match = re.search(r"\\b" + name + r":\\s*'(#(?:[a-fA-F0-9]{6}))'", hub)
            self.assertIsNotNone(match, f"hub colour missing: {name}")
            self.assertEqual(actual.lower(), match.group(1).lower())

    def test_missing_invalid_or_duplicate_colors_fail_closed(self):
        original = json.loads(DEFAULT_TOKEN_PATH.read_text(encoding="utf-8"))
        variants = []
        missing = copy.deepcopy(original)
        del missing["color"]["universe"]["green"]
        variants.append(missing)
        invalid = copy.deepcopy(original)
        invalid["color"]["universe"]["gold"]["$value"] = "not-a-color"
        variants.append(invalid)
        duplicate = copy.deepcopy(original)
        duplicate["color"]["universe"]["green"]["$value"] = original["color"]["universe"]["cyan"]["$value"]
        variants.append(duplicate)
        with tempfile.TemporaryDirectory() as tmp:
            token_file = Path(tmp) / "bad.json"
            for token in variants:
                token_file.write_text(json.dumps(token), encoding="utf-8")
                with self.assertRaisesRegex(MediaRenderError, r"UNIVERSE_PALETTE_"):
                    load_brand_palette(token_file)

    def assert_spectrum_rail(self, image_path: Path, colors: tuple[str, ...]):
        with Image.open(image_path) as image:
            image = image.convert("RGB")
            width, height = image.size
            marker_width = max(12, width // 36)
            step = max(marker_width + 10, (width - 64) // 7)
            y = max(12, height // 30) + 2
            for index, color in enumerate(colors):
                x = 32 + index * step + marker_width // 2
                actual = image.getpixel((x, y))
                expected = tuple(bytes.fromhex(color[1:]))
                self.assertEqual(actual, expected, f"missing visible {FAMILIES[index]} in {image_path}")

    def test_both_image_and_video_frame_render_all_seven_colors(self):
        palette = load_brand_palette()
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            card = folder / "landscape.png"
            frame = folder / "portrait-frame.png"
            render_brand_card(
                output_path=card, width=1280, height=720,
                title="Datenuniversum", subtitle="Quellen und Analyse",
                disclaimer="Bildungsinhalt, keine Anlageberatung.",
                palette=palette,
            )
            render_scene_frame(
                RenderScene(title="Sieben Farben", body="Eine eigene Datenwelt", duration_seconds=5),
                output_path=frame, palette=palette, scene_index=1, scene_count=1,
            )
            self.assert_spectrum_rail(card, palette.universe_colors)
            self.assert_spectrum_rail(frame, palette.universe_colors)


if __name__ == "__main__":
    unittest.main()
