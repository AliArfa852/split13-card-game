import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// A maskable icon is cropped to whatever shape the platform likes, so the mark
// has to survive a circle cut out of the middle 80%. The favicon at
// app/icon.svg fills its own box and would lose its corners here, which is why
// this is a separate drawing rather than the same file at another size.
// Route handlers are dynamic by default, and an icon rendered per request is
// pure waste: this drawing never changes. Prerender it with the rest.
export const dynamic = "force-static";

const GROUND = "#121212"; // --ground   0 0% 7%
const ACCENT = "#BA3F3B"; // --accent   2 52% 48%
const ACCENT_INK = "#FFF6F0"; // --accent-ink 23 100% 97%

const SIZE = 512;

export async function GET() {
  const extraBold = await readFile(
    join(process.cwd(), "app/fonts/NunitoSans-ExtraBold.ttf"),
  );
  return new ImageResponse(
    <div
      style={{
        width: SIZE,
        height: SIZE,
        background: GROUND,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Inside the safe zone: 5:7 card, the app's own proportion, sized so
            its rotated corners stay clear of a circular crop. */}
      <div
        style={{
          width: 200,
          height: 280,
          borderRadius: 34,
          background: ACCENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-6deg)",
        }}
      >
        <div
          style={{
            fontFamily: "Nunito Sans",
            fontSize: 108,
            fontWeight: 800,
            color: ACCENT_INK,
            letterSpacing: "-0.04em",
          }}
        >
          13
        </div>
      </div>
    </div>,
    {
      width: SIZE,
      height: SIZE,
      fonts: [
        {
          name: "Nunito Sans",
          data: extraBold,
          weight: 800 as const,
          style: "normal" as const,
        },
      ],
    },
  );
}
