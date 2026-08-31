import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The raster icon at purpose "any", alongside the SVG favicon. Installability
// checks look for a raster icon of at least 192 that is not maskable-only, and
// a maskable drawing cannot double as this one: it carries padding for a crop
// that will not happen here, so unmasked it reads as a small mark adrift in a
// large square.
export const dynamic = "force-static";

const GROUND = "#121212"; // --ground     0 0% 7%
const ACCENT = "#BA3F3B"; // --accent     2 52% 48%
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
      <div
        style={{
          width: 280,
          height: 392,
          borderRadius: 48,
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
            fontSize: 150,
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
