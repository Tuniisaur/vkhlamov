export interface ProjectStill {
  url: string;
  caption: { en: string; it: string };
  timecode?: string;
  frameType?: string;
  aspectRatio?: string;
}

export interface ProjectVideo {
  url: string;
  title?: string;
  duration?: string;
}

export interface LocalizedProject {
  id: string;
  title: { en: string; it: string };
  subtitle: { en: string; it: string };
  category?: "all" | "gt" | "rally" | "commercial" | "pursuit" | string;
  categoryLabel?: { en: string; it: string };
  year: string;
  client: string;
  location: string;
  duration: string;
  posterImage: string;
  videoPreviewUrl: string;
  fullVideoUrl: string;
  videos?: ProjectVideo[];
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
  description: { en: string; it: string };
  featured: boolean;
  stills?: ProjectStill[];
}

export const LOCALIZED_PROJECTS: LocalizedProject[] = [
  {
    "id": "formula-apex-hunter",
    "title": {
      "en": "// LE MANS 2026",
      "it": "// LE MANS 2026"
    },
    "subtitle": {
      "en": "24 Hours of Le Mans 2026",
      "it": "24 Hours of Le Mans 2026"
    },
    "category": "gt",
    "categoryLabel": {
      "en": "FORMULA & GT",
      "it": "FORMULA & GT"
    },
    "year": "2026",
    "client": "",
    "location": "Circuit de La Sarthe. France",
    "duration": "02:45",
    "posterImage": "/images/still-2026-09-23-130212_1-2-1-5306.jpg",
    "videoPreviewUrl": "/videos/portfolio-wec-preview.mp4",
    "fullVideoUrl": "/videos/portfolio-wec-8155.mp4",
    "telemetry": {
      "speed": "312 KM/H",
      "gForce": "4.2 G",
      "track": "VARIANTE ASCARI & PRIMA VARIANTE",
      "timecode": "00:02:45:18"
    },
    "description": {
      "en": "A visceral cinematic plunge into Monza's legendary curbs and chicanes, capturing suspension dynamics over curbs and glowing carbon-ceramic brakes during threshold deceleration.",
      "it": ""
    },
    "featured": true,
    "stills": [
      {
        "url": "/images/still-2026-09-23-130212_1-2-1-3329.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-3-1-3441.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-5-1-3981.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-6-1-4175.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-7-1-4382.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-9-1-4528.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-10-1-4635.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-10-2-4718.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-11-1-4888.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-22-1-4971.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-22-2-5036.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-23-1-5133.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-24-1-5352.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-25-1-5520.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-26-1-5598.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-27-1-5721.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-30-1-5862.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-35-1-6095.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-36-1-6180.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-37-1-6233.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-47-1-6301.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-48-1-6396.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-50-1-6513.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-51-1-6584.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-52-1-6658.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-54-1-6720.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-56-1-6797.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-57-1-6939.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-59-1-7003.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-60-1-7072.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-63-1-7169.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-68-1-7233.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-70-1-7360.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-72-1-7447.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-74-1-7507.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      },
      {
        "url": "/images/still-2026-09-23-130212_1-77-1-7601.jpg",
        "caption": {
          "it": "",
          "en": ""
        }
      }
    ]
  }
];

export interface ArchiveFilm {
  id: string;
  year: string;
  title: string;
  client: string;
  role: string;
  category: "commercial" | "motorsport" | "pursuit" | "documentary";
  categoryLabel: { en: string; it: string };
  format: string;
  location: string;
  videoPreview: string;
  duration: string;
}

export const ARCHIVE_FILMS: ArchiveFilm[] = [
  {
    id: "formula-apex-hunter",
    year: "2026",
    title: "APEX HUNTER // FORMULA APEX",
    client: "Porsche Motorsport & TAG Heuer",
    role: "Director of Photography",
    category: "motorsport",
    categoryLabel: { en: "FORMULA & GT", it: "FORMULA & GT" },
    format: "RED V-Raptor 8K • Cooke Anamorphic",
    location: "Monza, Italy",
    videoPreview: "/videos/formula.webm",
    duration: "02:45",
  },
  {
    id: "hypercar-track-pursuit",
    year: "2026",
    title: "RADICAL OVERTAKE // TRACK PURSUIT",
    client: "McLaren Customer Racing",
    role: "Pursuit Camera DP",
    category: "pursuit",
    categoryLabel: { en: "TRACK PURSUIT", it: "INSEGUIMENTO PISTA" },
    format: "RED Komodo 6K • Laowa 12mm Zero-D",
    location: "Spa-Francorchamps, Belgium",
    videoPreview: "/videos/hypercar.webm",
    duration: "01:45",
  },
  {
    id: "gravel-apex-wrc",
    year: "2025",
    title: "GRAVEL APEX // WRC TERRA SARDEGNA",
    client: "FIA World Rally Championship",
    role: "Director of Photography",
    category: "motorsport",
    categoryLabel: { en: "RALLY & DIRT", it: "RALLY & TERRA" },
    format: "Sony FX6 & FX3 • Angenieux EZ Zoom",
    location: "Sardinia, Italy",
    videoPreview: "/videos/rally.webm",
    duration: "03:12",
  },
  {
    id: "the-monolith-hypercar",
    year: "2025",
    title: "THE MONOLITH // HYPERCAR REEL",
    client: "Rimac Automobili & Pininfarina",
    role: "Director & Cinematographer",
    category: "commercial",
    categoryLabel: { en: "COMMERCIAL CAMPAIGN", it: "CAMPAGNA COMMERCIALE" },
    format: "ARRI Alexa Mini LF • Bolt Cinebot",
    location: "Studio Soundstage 4, Milan",
    videoPreview: "/videos/hero-showreel.webm",
    duration: "02:10",
  },
  {
    id: "temple-of-speed-monza",
    year: "2025",
    title: "TEMPLE OF SPEED // 24H MONZA GT3",
    client: "Ferrari Competizioni GT",
    role: "Director of Photography",
    category: "motorsport",
    categoryLabel: { en: "ENDURANCE CINEMA", it: "CINEMA ENDURANCE" },
    format: "RED Raptor 8K • Zeiss Supreme Primes",
    location: "Monza, Italy",
    videoPreview: "/videos/formula.webm",
    duration: "04:30",
  },
  {
    id: "green-hell-nordschleife",
    year: "2025",
    title: "GREEN HELL ADRENALINE // NORDSCHLEIFE",
    client: "BMW M Motorsport",
    role: "Camera Car DP & Operator",
    category: "pursuit",
    categoryLabel: { en: "TRACK PURSUIT", it: "INSEGUIMENTO PISTA" },
    format: "Sony FX3 • Leica R Cine Primes",
    location: "Nürburgring, Germany",
    videoPreview: "/videos/hypercar.webm",
    duration: "02:20",
  },
  {
    id: "lemans-24h-night",
    year: "2024",
    title: "24 HOURS UNDER THE STARS // LE MANS",
    client: "Aston Martin Racing & FIA WEC",
    role: "Director of Photography",
    category: "documentary",
    categoryLabel: { en: "DOCUMENTARY SHORT", it: "CORTO DOCUMENTARIO" },
    format: "ARRI Alexa 35 • Master Anamorphic",
    location: "Circuit de la Sarthe, France",
    videoPreview: "/videos/hero-showreel.webm",
    duration: "05:15",
  },
  {
    id: "pista-veloce-pirelli",
    year: "2024",
    title: "PISTA VELOCE // PIRELLI TROFEO",
    client: "Pirelli & Maserati Corse",
    role: "Director & Cinematographer",
    category: "commercial",
    categoryLabel: { en: "COMMERCIAL CAMPAIGN", it: "CAMPAGNA COMMERCIALE" },
    format: "RED Komodo 6K • Cooke S4/i Primes",
    location: "Autodromo Imola, Italy",
    videoPreview: "/videos/formula.webm",
    duration: "01:30",
  },
];

export const TRANSLATIONS = {
  en: {
    // Navbar
    nav: {
      tagline: "DIRECTOR OF PHOTOGRAPHY",
      works: "SELECTED WORKS",
      archive: "ARCHIVE",
      about: "ABOUT",
      contact: "CONTACT",
      bookBtn: "INQUIRE",
      soundOn: "Mute sound feedback",
      soundOff: "Enable interactive sound feedback",
      langToggle: "IT",
    },
    // Hero
    hero: {
      statusBadge: "2026 SHOWREEL // 4K TRACK CINEMA",
      titleLine1: "VALERIO KHLAMOV",
      titleLine2: "",
      tagline:
        "Director of Photography specialized in high-octane automotive cinema, high-speed camera car pursuit, and visceral motorsport campaigns for premier global manufacturers.",
      btnWorks: "VIEW SELECTED WORKS",
      btnReel: "WATCH 2026 REEL",
      specTopSpeedLabel: "MAX TRACK SPEED",
      specTopSpeedVal: "312+ KM/H",
      specSensorLabel: "CAPTURE SENSOR",
      specSensorVal: "RED 8K & SONY FX3",
      specAccreditationLabel: "ACCREDITATION",
      specAccreditationVal: "FIA PADDOCK PASS",
      specBaseLabel: "BASE & AVAILABILITY",
      specBaseVal: "MILAN / WORLDWIDE",
      seasonOpen: "AVAILABLE FOR PROJECTS WORLDWIDE",
      audioOff: "AUDIO OFF",
      audioOn: "AUDIO ON",
      play: "Play video",
      pause: "Pause video",
    },
    // Marquee / Official Accreditations
    marqueeHeader: {
      badge: "SELECTED COLLABORATIONS & BROADCAST PARTNERS",
      verified: "COMMISSIONED WORK // FIA & MANUFACTURER VERIFIED",
    },
    marquee: [
      "PORSCHE MOTORSPORT",
      "TAG HEUER",
      "FERRARI COMPETIZIONI GT",
      "FIA WORLD ENDURANCE CHAMPIONSHIP",
      "MCLAREN CUSTOMER RACING",
      "FIA WORLD RALLY CHAMPIONSHIP",
      "RED DIGITAL CINEMA 8K",
      "BMW M MOTORSPORT",
      "PIRELLI TROFEO",
      "24 HEURES DU MANS",
      "ASTON MARTIN RACING",
    ],
    // Works / Projects
    works: {
      badge: "01 // SELECTED WORKS",
      title: "SELECTED WORKS",
      subtitle:
        "Curated selection of high-velocity track cinema, automotive commercials, and visceral car-to-car pursuit films.",
      catAll: "ALL FILMS",
      catGt: "FORMULA & GT",
      catPursuit: "TRACK PURSUIT",
      catRally: "RALLY & DIRT",
      catCommercial: "COMMERCIALS",
      playFilm: "PLAY FILM",
      watchInTheater: "ENTER 4K THEATER ↗",
      cameraSensor: "CAMERA SENSOR",
      topSpeed: "MAX SPEED",
    },
    // Film Archive / Project Index
    archive: {
      badge: "02 // FILMOGRAPHY INDEX",
      title: "PROJECT ARCHIVE",
      subtitle:
        "Complete chronological catalogue of commercial campaigns, high-speed pursuit tracking runs, and documentary projects from 2024 to 2026.",
      filterAll: "ALL PRODUCTIONS",
      filterCommercial: "COMMERCIALS",
      filterMotorsport: "MOTORSPORT",
      filterPursuit: "PURSUIT",
      filterDoc: "DOCUMENTARY",
      colYear: "YEAR",
      colTitle: "PROJECT / FILM",
      colClient: "CLIENT / BRAND",
      colRole: "ROLE",
      colFormat: "FORMAT & OPTICS",
      colCategory: "GENRE",
      colAction: "WATCH",
    },
    // Project Modal
    modal: {
      maxSpeed: "MAX SPEED CAPTURED",
      corneringForce: "CORNERING FORCE",
      fpsRes: "FRAME RATE & RESOLUTION",
      trackSector: "TRACK SECTOR",
      directorNotes: "PRODUCTION & DIRECTORIAL MEMO",
      mute: "Mute audio",
      unmute: "Unmute Audio",
      close: "Close",
    },
    // About
    about: {
      badge: "03 // PROFILE & DIRECTION",
      title: "ABOUT VALERIO KHLAMOV",
      photoBadge: "ON TRACK // MONZA PADDOCK",
      photoCopy: "© VALERIO KHLAMOV",
      philosophyTitle: "DIRECTORIAL PHILOSOPHY & SPEED",
      p1:
        "In motorsport there is no second take. Operating along curbs and within hot pit lanes, I blend visceral racing unpredictability with the compositional precision of high-end cinematic productions.",
      p2:
        "Through dynamic pursuit direction and curbside positioning, I place audiences right inside the cockpit vortex and the heart of the race.",
      credentialsTitle: "PROFESSIONAL TRACKSIDE ACCREDITATIONS",
      credentialsSub: "CINEMA & MOTORSPORT PRODUCTION",
      credentials: [
        "FIA ACCREDITED PRESS PADDOCK MEDIA PASS",
        "HOT PIT LANE & TRACKSIDE SAFETY CERTIFIED",
        "RACE WEEKEND DIGITAL WORKFLOW: 4K REELS IN 24H",
        "OFFICIAL COMMISSIONS FOR PORSCHE, RED BULL & MCLAREN TEAMS",
      ],
      gearItems: [],
    },
    // Commissions & Representation (Pure Editorial Portfolio Contact)
    contact: {
      badge: "04 // INQUIRIES & COMMISSIONS",
      title: "COMMISSIONS & REPRESENTATION",
      subtitle:
        "Available worldwide for automotive commercial campaigns, high-speed pursuit tracking runs, and documentary productions. Inquire directly or through production representation.",
      directEmailLabel: "DIRECT INQUIRIES",
      directEmail: "contact@valeriokhlamov.com",
      hotlineLabel: "WHATSAPP & PHONE // TRACKSIDE DESK",
      hotline: "+39 349 821 0492",
      hqLabel: "PRIMARY HEADQUARTERS",
      hq: "Milan & Monza, Italy",
      hqDetails: "Available for worldwide deployments and international transfers.",
      representationLabel: "COMMERCIAL REPRESENTATION",
      representation: "Worldwide freelance commissions & agency partnerships (Milan • London • Global)",
      vimeoLabel: "VIMEO ARCHIVE",
      instagramLabel: "INSTAGRAM",
      imdbLabel: "IMDb PROFILE",
      formName: "YOUR NAME / COMPANY OR PRODUCTION *",
      formNamePl: "e.g. Elena Rostova — Studio Cine Milan",
      formEmail: "WORK EMAIL ADDRESS *",
      formEmailPl: "elena@studiocine.com",
      formType: "PRODUCTION ASSIGNMENT",
      formType1: "Automotive Commercial / Brand Launch Campaign",
      formType2: "Race Weekend Track Cinema & 24h Turnaround Reels",
      formType3: "High-Speed Car-to-Car Pursuit Tracking Rig",
      formType4: "Documentary Feature / Short Film",
      formBrief: "PROJECT BRIEF, LOCATION & TIMELINE *",
      formBriefPl:
        "Proposed filming dates, locations, vehicle models involved, required delivery formats...",
      formSubmit: "TRANSMIT PRODUCTION INQUIRY",
      successTitle: "INQUIRY DISPATCHED",
      successMsg:
        "Thank you for contacting Valerio Khlamov. Your production memo has been received. You will receive a direct response within 24 business hours.",
      sendAnother: "Send another message",
    },
    // Footer
    footer: {
      tagline: "DIRECTOR OF PHOTOGRAPHY // MOTORSPORT & AUTOMOTIVE CINEMA",
      backToTop: "BACK TO TOP ↑",
      rights: "VALERIO KHLAMOV. ALL RIGHTS RESERVED.",
      locations: "MILAN // MONZA // AVAILABLE WORLDWIDE",
    },
  },

  it: {
    // Navbar
    nav: {
      tagline: "DIRECTOR OF PHOTOGRAPHY",
      works: "LAVORI",
      archive: "ARCHIVIO",
      about: "CHI È",
      contact: "CONTATTI",
      bookBtn: "SCRIVIMI",
      soundOn: "Disattiva feedback sonoro UI",
      soundOff: "Attiva feedback sonoro interattivo",
      langToggle: "EN",
    },
    // Hero
    hero: {
      statusBadge: "2026 SHOWREEL // 4K CINEMA PISTA",
      titleLine1: "VALERIO KHLAMOV",
      titleLine2: "",
      tagline:
        "Direttore della Fotografia specializzato in cinema automotive ad alta tensione, camera car pursuit ad altissima velocità e campagne per prestigiosi brand internazionali.",
      btnWorks: "I FILM REALIZZATI",
      btnReel: "GUARDA SHOWREEL 2026",
      specTopSpeedLabel: "VELOCITÀ IN PISTA",
      specTopSpeedVal: "312+ KM/H",
      specSensorLabel: "SENSORE CAMERA",
      specSensorVal: "RED 8K & SONY FX3",
      specAccreditationLabel: "ACCREDITAMENTO",
      specAccreditationVal: "FIA PADDOCK PASS",
      specBaseLabel: "BASE & TRASFERTE",
      specBaseVal: "MILANO / WORLDWIDE",
      seasonOpen: "DISPONIBILE PER PRODUZIONI MONDIALI",
      audioOff: "AUDIO OFF",
      audioOn: "AUDIO ON",
      play: "Riproduci video",
      pause: "Pausa video",
    },
    // Marquee / Official Accreditations
    marqueeHeader: {
      badge: "COLLABORAZIONI UFFICIALI & COMMISSIONI BRAND",
      verified: "PRODUZIONI COMMISSIONATE // VERIFICATO FIA & CASE COSTRUTTRICI",
    },
    marquee: [
      "PORSCHE MOTORSPORT",
      "TAG HEUER",
      "FERRARI COMPETIZIONI GT",
      "FIA WORLD ENDURANCE CHAMPIONSHIP",
      "MCLAREN CUSTOMER RACING",
      "FIA WORLD RALLY CHAMPIONSHIP",
      "RED DIGITAL CINEMA 8K",
      "BMW M MOTORSPORT",
      "PIRELLI TROFEO",
      "24 HEURES DU MANS",
      "ASTON MARTIN RACING",
    ],
    // Works / Projects
    works: {
      badge: "01 // I LAVORI REALIZZATI",
      title: "SELECTED WORKS",
      subtitle:
        "Selezione curata di cinema su pista ad alta velocità, spot commerciali automotive e filmati pursuit car-to-car ad altissima quota adrenalinica.",
      catAll: "TUTTI I FILM",
      catGt: "FORMULA & GT",
      catPursuit: "TRACK PURSUIT",
      catRally: "RALLY & DIRT",
      catCommercial: "COMMERCIAL & SPOT",
      playFilm: "RIPRODUCI FILM",
      watchInTheater: "APRI CINEMA 4K ↗",
      cameraSensor: "SENSORE CAMERA",
      topSpeed: "VELOCITÀ MAX",
    },
    // Film Archive / Project Index
    archive: {
      badge: "02 // ARCHIVIO COMPLETO DELLA FILMOGRAFIA",
      title: "ARCHIVIO PROGETTI",
      subtitle:
        "Catalogo cronologico completo di spot commerciali, brand film e cinema su pista ad alta velocità dal 2024 al 2026.",
      filterAll: "TUTTE LE PRODUZIONI",
      filterCommercial: "COMMERCIAL & SPOT",
      filterMotorsport: "MOTORSPORT",
      filterPursuit: "PURSUIT",
      filterDoc: "DOCUMENTARIO",
      colYear: "ANNO",
      colTitle: "FILM / PROGETTO",
      colClient: "CLIENTE / BRAND",
      colRole: "RUOLO",
      colFormat: "FORMATO & OTTICHE",
      colCategory: "GENERE",
      colAction: "GUARDA",
    },
    // Project Modal
    modal: {
      maxSpeed: "MAX SPEED CATTURATA",
      corneringForce: "CORNERING FORCE",
      fpsRes: "FRAME RATE & RISOLUZIONE",
      trackSector: "SETTORE CIRCUITO",
      directorNotes: "NOTE DI PRODUZIONE & REGIA",
      mute: "Disattiva audio",
      unmute: "Attiva audio",
      close: "Chiudi",
    },
    // About
    about: {
      badge: "03 // PROFILO & REGIA",
      title: "CHI È VALERIO KHLAMOV",
      photoBadge: "ON TRACK // MONZA PADDOCK",
      photoCopy: "© VALERIO KHLAMOV",
      philosophyTitle: "FILOSOFIA REGISTICA & VELOCITÀ",
      p1:
        "Nel motorsport non esiste il secondo ciak. Opero direttamente a filo cordolo e dentro i box, fondendo l'imprevedibilità agonistica con l'eleganza compositiva delle grandi produzioni cinematografiche.",
      p2:
        "Attraverso una regia dinamica pursuit ad altissima velocità e posizionamenti a filo cordolo, porto lo spettatore direttamente dentro l'abitacolo dei piloti e nel cuore della gara.",
      credentialsTitle: "ACCREDITAMENTI PROFESSIONALI DI PISTA",
      credentialsSub: "PRODUZIONE CINEMA & MOTORSPORT",
      credentials: [
        "ACCREDITAMENTO STAMPA FIA PADDOCK MEDIA PASS",
        "CERTIFICAZIONE SICUREZZA BORDO PISTA & HOT PIT LANE",
        "WORKFLOW DIGITALE DA GARA: CONSEGNA REEL 4K IN 24H",
        "COLLABORAZIONI UFFICIALI CON SCUDERIE PORSCHE, RED BULL & MCLAREN",
      ],
      gearItems: [],
    },
    // Commissions & Representation (Pure Editorial Portfolio Contact)
    contact: {
      badge: "04 // INGAGGI & RAPPRESENTANZA",
      title: "COMMISSIONI & RAPPRESENTANZA",
      subtitle:
        "Disponibile in tutto il mondo per campagne commerciali automotive, produzioni cinematografiche e camera car ad alta velocità su pista. Richieste dirette o tramite agenzia.",
      directEmailLabel: "EMAIL DIRETTA PRODUZIONE",
      directEmail: "contact@valeriokhlamov.com",
      hotlineLabel: "WHATSAPP & CONTATTO DIRETTO PISTA",
      hotline: "+39 349 821 0492",
      hqLabel: "BASE OPERATIVA PRINCIPALE",
      hq: "Milano & Monza, Italia",
      hqDetails: "Disponibile per trasferte internazionali e produzioni in circuito.",
      representationLabel: "RAPPRESENTANZA COMMERCIALE",
      representation: "Collaborazioni freelance dirette & rappresentanza internazionale (Milano • Londra • Worldwide)",
      vimeoLabel: "ARCHIVIO VIMEO",
      instagramLabel: "INSTAGRAM",
      imdbLabel: "PROFILO IMDb",
      formName: "NOME / AZIENDA O CASA DI PRODUZIONE *",
      formNamePl: "es. Elena Rossi — Studio Cine Milano",
      formEmail: "EMAIL AZIENDALE O PERSONALE *",
      formEmailPl: "elena@studiocine.com",
      formType: "TIPOLOGIA PRODUZIONE",
      formType1: "Spot Commercial / Lancio Vettura o Brand",
      formType2: "Copertura Cinema Race Weekend & Reel in 24h",
      formType3: "Inseguimenti Pista & Pursuit Camera Car",
      formType4: "Documentario / Lungometraggio",
      formBrief: "DETTAGLI PROGETTO, LOCATION & DATE *",
      formBriefPl: "Date di ripresa previste, circuiti o location, modelli di vettura, formati di consegna...",
      formSubmit: "INVIA RICHIESTA PRODUZIONE",
      successTitle: "RICHIESTA INVIATA",
      successMsg:
        "Grazie per aver contattato Valerio Khlamov. La tua richiesta è stata registrata; riceverai una risposta entro 24 ore lavorative.",
      sendAnother: "Invia un altro messaggio",
    },
    // Footer
    footer: {
      tagline: "DIRECTOR OF PHOTOGRAPHY // MOTORSPORT & AUTOMOTIVE CINEMA",
      backToTop: "TORNA IN CIMA ↑",
      rights: "VALERIO KHLAMOV. TUTTI I DIRITTI RISERVATI.",
      locations: "MILANO // MONZA // DISPONIBILE WORLDWIDE",
    },
  },
};
