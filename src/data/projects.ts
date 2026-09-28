export interface Project {
  id: string;
  title: string;

  category: "all" | "gt" | "rally" | "commercial" | "pursuit";
  categoryLabel: string;
  year: string;
  client: string;
  location: string;
  duration: string;
  posterImage: string;
  videoPreviewUrl: string;
  fullVideoUrl: string;
  gear?: {
    camera?: string;
    lens?: string;
    fps?: string;
    rig?: string;
  };
  telemetry: {
    speed: string;
    gForce: string;
    track: string;
    timecode: string;
  };
  description: string;
  featured: boolean;
}

export const PROJECTS: Project[] = [
  {
    id: "formula-apex-hunter",
    title: "APEX HUNTER // FORMULA APEX",

    category: "gt",
    categoryLabel: "FORMULA & GT",
    year: "2026",
    client: "Porsche Motorsport & Tag Heuer",
    location: "Autodromo Nazionale Monza, Italy",
    duration: "02:45",
    posterImage: "/images/gt-night-race.jpg",
    videoPreviewUrl: "/videos/formula.webm",
    fullVideoUrl: "/videos/formula.webm",
    telemetry: {
      speed: "312 KM/H",
      gForce: "4.2 G",
      track: "VARIANTE ASCARI & PRIMA VARIANTE",
      timecode: "00:02:45:18",
    },
    description: "Un'immersione viscerale tra le curve leggendarie di Monza, catturando il lavoro delle sospensioni sui cordoli e i dischi carboceramici incandescenti nelle frenate al limite.",
    featured: true,
  },
  {
    id: "hypercar-track-pursuit",
    title: "RADICAL OVERTAKE // TRACK PURSUIT",

    category: "pursuit",
    categoryLabel: "HIGH-SPEED PURSUIT",
    year: "2026",
    client: "McLaren Customer Racing",
    location: "Circuit de Spa-Francorchamps, Belgium",
    duration: "01:45",
    posterImage: "/images/gt-night-race.jpg",
    videoPreviewUrl: "/videos/hypercar.webm",
    fullVideoUrl: "/videos/hypercar.webm",
    telemetry: {
      speed: "228 KM/H",
      gForce: "4.8 G",
      track: "EAU ROUGE / RAIDILLON",
      timecode: "00:01:45:04",
    },
    description: "Inseguimento dinamico millimetrico a oltre 220 km/h a pochi centimetri dal flap in carbonio lungo la compressione dell'Eau Rouge.",
    featured: true,
  },
  {
    id: "rally-wrc-dust",
    title: "GRAVEL APEX // WRC TERRA SARDEGNA",

    category: "rally",
    categoryLabel: "RALLY & DIRT",
    year: "2025",
    client: "Red Bull Motorsports",
    location: "Olbia & Monte Acuto, Sardegna",
    duration: "03:12",
    posterImage: "/images/rally-wrc.jpg",
    videoPreviewUrl: "/videos/rally.webm",
    fullVideoUrl: "/videos/rally.webm",
    telemetry: {
      speed: "172 KM/H",
      gForce: "3.2 G",
      track: "MONTE LERNO JUMP & DUST TRAIL",
      timecode: "00:03:12:22",
    },
    description: "La brutalità delle strade sterrate e dei salti ciechi del Rally Italia Sardegna. Slow motion immerso nella polvere d'oro del tramonto, combinato con sound design ricavato da microfoni shotgun a ridosso degli scarichi.",
    featured: true,
  },
  {
    id: "hypercar-commercial-monolith",
    title: "THE MONOLITH // HYPERCAR REEL",

    category: "commercial",
    categoryLabel: "COMMERCIAL & SHOWREEL",
    year: "2026",
    client: "Automobili Pininfarina / Rimac",
    location: "Cinecittà Studios & Track Lab",
    duration: "02:10",
    posterImage: "/images/commercial-hypercar.jpg",
    videoPreviewUrl: "/videos/hero-showreel.webm",
    fullVideoUrl: "/videos/hero-showreel.webm",
    telemetry: {
      speed: "0-100 IN 1.8S",
      gForce: "2.1 G",
      track: "STUDIO SOUNDSTAGE 4",
      timecode: "00:02:10:00",
    },
    description: "Spot di lancio ad altissima tensione emotiva per una hypercar elettrica da oltre 1900 cavalli. Movimenti robotici millimetrici con Cinebot ad altissima velocità e tubi LED programmabili sincronizzati con la colonna sonora.",
    featured: true,
  },
];
