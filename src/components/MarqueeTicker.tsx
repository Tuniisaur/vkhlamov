"use client";

interface BrandLogo {
  id: string;
  name: string;
  svg: React.ReactNode;
}

const LOGOS: BrandLogo[] = [
  // 1. FIA WEC
  {
    id: "fia-wec",
    name: "FIA World Endurance Championship",
    svg: (
      <svg className="h-6 sm:h-7 w-auto" viewBox="0 0 160 40" fill="currentColor">
        {/* FIA globe icon */}
        <circle cx="16" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.8" />
        <ellipse cx="16" cy="20" rx="13" ry="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
        <path d="M16 7v26" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
        <text x="36" y="24" fontFamily="sans-serif" fontSize="14" fontWeight="900" letterSpacing="0.08em">
          FIA
        </text>
        <text x="68" y="27" fontFamily="sans-serif" fontSize="22" fontWeight="900" fontStyle="italic" letterSpacing="0.05em">
          WEC
        </text>
        {/* Speed underline accent */}
        <path d="M68 32h56l6-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },

  // 2. 24H LE MANS
  {
    id: "lemans",
    name: "24 Heures du Mans",
    svg: (
      <svg className="h-7 sm:h-8 w-auto" viewBox="0 0 150 40" fill="currentColor">
        {/* Stylized '24' badge */}
        <path d="M8 29h22v-3.5L18 16c2.5-1 4-3 4-5.5 0-3.5-3-5.5-7.5-5.5-4 0-7 2-7.5 5.5l3.5.5c.3-2 1.8-3 4-3 2.2 0 3.8 1 3.8 2.8 0 2-1.5 3.2-3.8 3.8L5 25v4z" />
        <path d="M38 5v14h7v-14h4.5v18.5H45V30h-4.5v-6.5h-10V18l10-13h-2.5z" />
        <text x="56" y="16" fontFamily="sans-serif" fontSize="9" fontWeight="900" letterSpacing="0.25em">
          HEURES DU
        </text>
        <text x="56" y="29" fontFamily="sans-serif" fontSize="16" fontWeight="900" fontStyle="italic" letterSpacing="0.15em">
          MANS
        </text>
      </svg>
    ),
  },

  // 3. FIA WRC
  {
    id: "wrc",
    name: "FIA World Rally Championship",
    svg: (
      <svg className="h-6 sm:h-7 w-auto" viewBox="0 0 140 40" fill="currentColor">
        <text x="2" y="15" fontFamily="sans-serif" fontSize="8" fontWeight="800" letterSpacing="0.2em">
          FIA
        </text>
        {/* Bold slanted WRC */}
        <path d="M2 30l6-13h5.5l3 7.5 3-7.5H25l-6 13h-5l-3-7-3 7H2z" />
        <path d="M27 17h9c4 0 6 1.8 6 4.5 0 2-1 3.5-3 4l4 4.5h-5.5l-3.5-4h-2.5V30H27V17zm4.5 6.5h3.5c1.2 0 2-.6 2-1.5s-.8-1.5-2-1.5h-3.5v3z" />
        <path d="M51 23.5c0-4 3-7 7.5-7 3.5 0 6 2 7 4.5l-4 1.8c-.5-1.5-1.5-2.5-3-2.5-2 0-3.5 1.5-3.5 3.5s1.5 3.5 3.5 3.5c1.5 0 2.5-1 3-2.5l4 1.8c-1 2.5-3.5 4.5-7 4.5-4.5 0-7.5-3-7.5-7.3z" />
      </svg>
    ),
  },

  // 4. PORSCHE MOTORSPORT
  {
    id: "porsche",
    name: "Porsche Motorsport",
    svg: (
      <svg className="h-5 sm:h-6 w-auto" viewBox="0 0 180 32" fill="currentColor">
        <text x="0" y="16" fontFamily="sans-serif" fontSize="13" fontWeight="900" letterSpacing="0.4em">
          PORSCHE
        </text>
        <text x="1" y="28" fontFamily="sans-serif" fontSize="8" fontWeight="700" letterSpacing="0.3em" opacity="0.65">
          MOTORSPORT
        </text>
      </svg>
    ),
  },

  // 5. GT WORLD CHALLENGE
  {
    id: "gt-world-challenge",
    name: "GT World Challenge",
    svg: (
      <svg className="h-6 sm:h-7 w-auto" viewBox="0 0 170 38" fill="currentColor">
        {/* Big stylized GT mark */}
        <text x="0" y="26" fontFamily="sans-serif" fontSize="24" fontWeight="900" fontStyle="italic" letterSpacing="-0.02em">
          GT
        </text>
        <line x1="38" y1="8" x2="38" y2="30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
        <text x="46" y="16" fontFamily="sans-serif" fontSize="8" fontWeight="900" letterSpacing="0.2em">
          WORLD CHALLENGE
        </text>
        <text x="46" y="27" fontFamily="sans-serif" fontSize="7" fontWeight="600" letterSpacing="0.15em" opacity="0.6">
          POWERED BY AWS
        </text>
      </svg>
    ),
  },

  // 6. FERRARI CORSE CLIENTI / CHALLENGE
  {
    id: "ferrari-challenge",
    name: "Ferrari Challenge",
    svg: (
      <svg className="h-6 sm:h-7 w-auto" viewBox="0 0 160 38" fill="currentColor">
        {/* Shield outline */}
        <path d="M12 4l9 3.5v9c0 6-4.5 11-9 13-4.5-2-9-7-9-13v-9L12 4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 9v14M8 14h8" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
        <text x="29" y="17" fontFamily="sans-serif" fontSize="11" fontWeight="900" letterSpacing="0.2em">
          FERRARI
        </text>
        <text x="29" y="28" fontFamily="sans-serif" fontSize="8" fontWeight="800" fontStyle="italic" letterSpacing="0.18em" opacity="0.75">
          CHALLENGE
        </text>
      </svg>
    ),
  },

  // 7. AUTODROMO NAZIONALE MONZA
  {
    id: "monza",
    name: "Autodromo Nazionale Monza",
    svg: (
      <svg className="h-6 sm:h-7 w-auto" viewBox="0 0 170 38" fill="currentColor">
        {/* Track outline */}
        <path
          d="M8 25c0-4 3-7 7-7h16c4 0 7-3 7-7s-3-7-7-7H14c-6 0-9 4-9 8v13z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text x="44" y="17" fontFamily="sans-serif" fontSize="10" fontWeight="900" letterSpacing="0.18em">
          MONZA
        </text>
        <text x="44" y="28" fontFamily="sans-serif" fontSize="7" fontWeight="600" letterSpacing="0.22em" opacity="0.65">
          TEMPLE OF SPEED
        </text>
      </svg>
    ),
  },

  // 8. CIRCUIT DE SPA-FRANCORCHAMPS
  {
    id: "spa",
    name: "Circuit de Spa-Francorchamps",
    svg: (
      <svg className="h-6 sm:h-7 w-auto" viewBox="0 0 165 38" fill="currentColor">
        {/* Eau Rouge track contour */}
        <path
          d="M6 26l8-14 8 4 10-10 6 8-4 12H6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="40" y="17" fontFamily="sans-serif" fontSize="9" fontWeight="900" letterSpacing="0.2em">
          SPA
        </text>
        <text x="40" y="28" fontFamily="sans-serif" fontSize="7" fontWeight="700" letterSpacing="0.15em" opacity="0.65">
          FRANCORCHAMPS
        </text>
      </svg>
    ),
  },

  // 9. NÜRBURGRING
  {
    id: "nurburgring",
    name: "Nürburgring Nordschleife",
    svg: (
      <svg className="h-6 sm:h-7 w-auto" viewBox="0 0 170 38" fill="currentColor">
        {/* Green Hell contour */}
        <path
          d="M16 5c-7 0-11 5-11 12 0 4 2 8 5 10l6 5 7-2c4-2 6-5 6-9 0-7-6-16-13-16z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="36" y="17" fontFamily="sans-serif" fontSize="9" fontWeight="900" letterSpacing="0.18em">
          NÜRBURGRING
        </text>
        <text x="36" y="28" fontFamily="sans-serif" fontSize="7" fontWeight="700" letterSpacing="0.22em" opacity="0.65">
          THE GREEN HELL
        </text>
      </svg>
    ),
  },

  // 10. IMSA
  {
    id: "imsa",
    name: "IMSA WeatherTech",
    svg: (
      <svg className="h-5 sm:h-6 w-auto" viewBox="0 0 130 32" fill="currentColor">
        {/* IMSA speed chevrons */}
        <path d="M4 25l6-18h6l-6 18H4zM16 25l6-18h6l-6 18h-6zM28 25l6-18h6l-6 18h-6z" fill="currentColor" opacity="0.9" />
        <text x="48" y="21" fontFamily="sans-serif" fontSize="16" fontWeight="900" fontStyle="italic" letterSpacing="0.08em">
          IMSA
        </text>
      </svg>
    ),
  },
];

export default function MarqueeTicker() {
  // Duplicated for seamless infinite looping
  const logosLoop = [...LOGOS, ...LOGOS];

  return (
    <div className="relative py-6 sm:py-8 bg-[#050505] border-y border-white/[0.06] overflow-hidden select-none">
      {/* Edge gradient mask for smooth fade in/out */}
      <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

      {/* Pure horizontal scrolling logos */}
      <div className="flex animate-marquee-glide whitespace-nowrap items-center">
        {logosLoop.map((logo, idx) => (
          <div
            key={`${logo.id}-${idx}`}
            title={logo.name}
            className="mx-8 sm:mx-12 shrink-0 text-neutral-500 hover:text-white transition-colors duration-300 flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer group"
          >
            <div className="group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-all duration-300">
              {logo.svg}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
