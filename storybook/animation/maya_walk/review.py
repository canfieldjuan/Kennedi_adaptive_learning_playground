"""Standalone scientific diagnostics using standard-library PNG encoding only."""
import math
from pathlib import Path
import struct
import zlib

from .reference import SIGNATURES
from .spec import BaselineAlias


# Compact 5x7 label font. This is diagram lettering, not character artwork.
FONT = {
    "A": [14,17,17,31,17,17,17], "B": [30,17,17,30,17,17,30],
    "C": [14,17,16,16,16,17,14], "D": [30,17,17,17,17,17,30],
    "E": [31,16,16,30,16,16,31], "F": [31,16,16,30,16,16,16],
    "G": [14,17,16,23,17,17,15], "H": [17,17,17,31,17,17,17],
    "I": [14,4,4,4,4,4,14], "J": [7,2,2,2,18,18,12],
    "K": [17,18,20,24,20,18,17], "L": [16,16,16,16,16,16,31],
    "M": [17,27,21,21,17,17,17], "N": [17,25,21,19,17,17,17],
    "O": [14,17,17,17,17,17,14], "P": [30,17,17,30,16,16,16],
    "Q": [14,17,17,17,21,18,13], "R": [30,17,17,30,20,18,17],
    "S": [15,16,16,14,1,1,30], "T": [31,4,4,4,4,4,4],
    "U": [17,17,17,17,17,17,14], "V": [17,17,17,17,17,10,4],
    "W": [17,17,17,21,21,21,10], "X": [17,17,10,4,10,17,17],
    "Y": [17,17,10,4,4,4,4], "Z": [31,1,2,4,8,16,31],
    "0": [14,17,19,21,25,17,14], "1": [4,12,4,4,4,4,14],
    "2": [14,17,1,2,4,8,31], "3": [30,1,1,14,1,1,30],
    "4": [2,6,10,18,31,2,2], "5": [31,16,16,30,1,1,30],
    "6": [14,16,16,30,17,17,14], "7": [31,1,2,4,8,8,8],
    "8": [14,17,17,14,17,17,14], "9": [14,17,17,15,1,1,14],
    "-": [0,0,0,31,0,0,0], ".": [0,0,0,0,0,12,12],
    "/": [1,2,2,4,8,8,16], "%": [25,25,2,4,8,19,19],
    ":": [0,12,12,0,12,12,0], " ": [0]*7,
}


class Raster:
    def __init__(self, width, height):
        self.width, self.height = width, height
        self.pixels = bytearray(b"\xff"*(width*height*3))

    def dot(self, x, y, color):
        x, y = round(x), round(y)
        if 0 <= x < self.width and 0 <= y < self.height:
            i = (y*self.width+x)*3
            self.pixels[i:i+3] = bytes(color)

    def line(self, a, b, color, thickness=1):
        dx, dy = b[0]-a[0], b[1]-a[1]
        steps = max(1, math.ceil(max(abs(dx), abs(dy))))
        for i in range(steps+1):
            for extra in range(thickness):
                self.dot(a[0]+dx*i/steps, a[1]+dy*i/steps+extra, color)

    def text(self, x, y, text, color=(35,45,55), scale=1):
        for c in text.upper():
            for row, bits in enumerate(FONT.get(c, FONT[" "])):
                for col in range(5):
                    if bits & (1 << (4-col)):
                        for a in range(scale):
                            for b in range(scale):
                                self.dot(x+col*scale+a, y+row*scale+b, color)
            x += 6*scale

    def save(self, path):
        def chunk(kind, data):
            return struct.pack(">I", len(data))+kind+data+struct.pack(">I", zlib.crc32(kind+data)&0xffffffff)
        raw = b"".join(b"\x00"+self.pixels[y*self.width*3:(y+1)*self.width*3] for y in range(self.height))
        path.write_bytes(b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR", struct.pack(">IIBBBBB", self.width, self.height, 8, 2, 0, 0, 0))+
                         chunk(b"IDAT", zlib.compress(raw))+chunk(b"IEND", b""))
        path.chmod(0o600)


def reference_band(signal, phase):
    points = []
    for expected in SIGNATURES.get(signal, ()):
        if expected.low is None:
            return None
        center = (expected.start+((expected.end-expected.start) % 1)/2) % 1
        points.append((center, expected.low, expected.high))
    if not points:
        return None
    points.sort()
    extended = [(points[-1][0]-1, *points[-1][1:]), *points,
                (points[0][0]+1, *points[0][1:])]
    for a, b in zip(extended, extended[1:]):
        if a[0] <= phase <= b[0]:
            u = (phase-a[0])/(b[0]-a[0])
            return tuple(a[i]+u*(b[i]-a[i]) for i in (1, 2))
    raise ValueError("Uncovered reference band phase")


def render_plots(packet, report, output):
    output = Path(output)
    alias = BaselineAlias(packet["alias"]).value
    paths = []
    for signal in ("hip", "knee", "ankle", "pelvis_height", "toe_clearance"):
        def value(row):
            if signal == "pelvis_height":
                return row["points"]["hip"][2]
            if signal == "toe_clearance":
                return row["points"]["toe"][2]
            return row["angles"][signal]

        curves = []
        for cycle in report["cycles"]:
            start, end = (f-1 for f in cycle["frames"])
            rows = [r for r in packet["samples"] if r["side"] == cycle["side"] and start <= r["time"] <= end]
            curves.append((cycle["side"], [((r["time"]-start)/(end-start), value(r)) for r in rows]))
        values = [v for _, curve in curves for _, v in curve]
        if not values:
            raise ValueError("Cannot plot missing complete cycles")
        bands = [reference_band(signal, i/1000) for i in range(1001)]
        bounds = values+[v for band in bands if band for v in band]
        span = max(max(bounds)-min(bounds), .01)
        low, high = min(bounds)-span*.12, max(bounds)+span*.12
        img = Raster(1000, 620)
        left, right, top, bottom = 95, 960, 120, 475
        def xy(p, v):
            return left+p*(right-left), bottom-(v-low)/(high-low)*(bottom-top)

        img.text(30, 20, packet["alias"]+" / "+signal.replace("_", " "), scale=3)
        img.text(30, 54, "SAVED SCENE - ALL COMPLETE CYCLES - NO PLAYBACK ACCEPTANCE", scale=2)
        img.text(30, 83, "NEAR", (25,90,180), 2)
        img.text(120, 83, "FAR", (200,95,25), 2)
        img.text(210, 83, "DESIGN BAND", (45,125,75), 2)
        img.text(410, 83, "DEGREES" if signal in SIGNATURES and signal != "pelvis_height" else "SCENE UNITS", scale=2)
        img.text(680, 83, "X EXTREMA", (90,45,115), 2)
        img.text(820, 83, "FAIL", (180,35,45), 2)
        for i, band in enumerate(bands):
            if band:
                img.line(xy(i/1000, band[0]), xy(i/1000, band[1]), (222,239,226))
        for i in range(6):
            v = low+(high-low)*i/5
            y = xy(0, v)[1]
            img.line((left, y), (right, y), (220,225,230))
            img.text(10, y-4, f"{v:.1f}" if span > 1 else f"{v:.3f}", scale=2)
        for i in range(11):
            x = xy(i/10, low)[0]
            img.line((x, top), (x, bottom), (235,238,241))
            img.text(x-10, bottom+14, str(i*10), scale=2)
        img.line((left, top), (left, bottom), (50,60,70))
        img.line((left, bottom), (right, bottom), (50,60,70))
        for side, curve in curves:
            for a, b in zip(curve, curve[1:]):
                img.line(xy(*a), xy(*b), (25,90,180) if side == "near" else (200,95,25), 2)
        # Bars show the admitted phase windows. They are separate from the
        # schematic amplitude envelope, which is not a time-series gate.
        for expected in SIGNATURES.get(signal, ()):
            spans = ((expected.start, 1.), (0., expected.end)) if expected.start > expected.end else ((expected.start, expected.end),)
            for lo, hi in spans:
                img.line((xy(lo, low)[0], top-8), (xy(hi, low)[0], top-8), (45,125,75), 3)
        for cycle in report["cycles"]:
            peaks = cycle["toe_clearance"]["extrema"] if signal == "toe_clearance" else cycle["extrema"].get(signal, ())
            for peak in peaks:
                x, y = xy(peak["phase"], peak["value"])
                img.line((x-4, y-4), (x+4, y+4), (90,45,115), 2)
                img.line((x-4, y+4), (x+4, y-4), (90,45,115), 2)
        for violation in report["violations"]:
            channel = "toe" if signal == "toe_clearance" else signal
            if violation["channel"] == channel and violation["phase"] is not None:
                x = xy(violation["phase"], low)[0]
                img.line((x, bottom-5), (x, bottom), (180,35,45), 2)
        img.text(360, 512, "STRIDE FROM INITIAL CONTACT %", scale=2)
        if bands[0]:
            img.text(30, 548, "SCHEMATIC BAND BETWEEN CITED TARGET EXTREMA", scale=2)
            img.text(30, 577, "ONLY DECLARED EXTREMA WINDOWS ARE GATED - SEE REPORT", scale=2)
        else:
            img.text(30, 548, "MEASURED HEIGHT - TIMING AND PROMINENCE GATES IN REPORT", scale=2)
            img.text(30, 577, "PELVIS IS A BODY HEIGHT PROXY - NOT MEASURED CENTER OF MASS", scale=2)
        path = output/f"{alias}-{signal}.png"
        img.save(path)
        paths.append(path.name)
    return paths
