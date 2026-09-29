import Link from "next/link";
import CustomCursor from "@/components/CustomCursor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LEGAL NOTICE, PRIVACY & COPYRIGHT // VALERIY KHLAMOV",
  description:
    "Privacy Policy (GDPR), Technical Cookie Disclosure, and Intellectual Property Terms for Valeriy Khlamov Studio.",
};

export default function LegalPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#050505] text-[#ececec] flex flex-col justify-between p-4 sm:p-8 md:p-12 font-mono selection:bg-white selection:text-black">
      <CustomCursor />

      {/* ── TOP HEADER ── */}
      <header className="relative z-20 w-full max-w-5xl mx-auto flex items-center justify-between border-b border-white/10 pb-4 text-xs tracking-wider">
        <Link
          href="/"
          className="text-white/50 hover:text-white hover:italic transition-colors"
        >
          [ VALERIY KHLAMOV ]
        </Link>
        <Link
          href="/"
          className="text-white/70 hover:text-white hover:italic transition-all duration-300 transform hover:-translate-x-1"
        >
          [ ← back to films ]
        </Link>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto py-10 sm:py-16 space-y-12 sm:space-y-16">
        {/* Title */}
        <section className="space-y-3">
          <span className="text-[11px] uppercase tracking-widest text-white/40 block">
            {"//"} LEGAL DOCUMENTATION & DATA GOVERNANCE
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light text-white tracking-tight lowercase italic">
            legal, privacy &amp; copyright
          </h1>
          <p className="text-xs sm:text-sm text-white/50 tracking-wider max-w-2xl font-light">
            Comprehensive disclosure regarding data protection (GDPR compliance), technical cookie governance, and intellectual property provisions for this directorial portfolio.
          </p>
        </section>

        {/* ── SECTION 1: PRIVACY POLICY ── */}
        <section className="space-y-6 pt-8 border-t border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-base sm:text-lg text-white font-medium tracking-wide uppercase">
              01 {"//"} Privacy Policy (GDPR — Regulation EU 2016/679)
            </h2>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-white/70 font-light">
            <p>
              In accordance with Article 13 of the General Data Protection Regulation (GDPR, EU Regulation 2016/679), this policy outlines how personal data is collected, handled, and safeguarded when interacting with this website.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
                <span className="text-[10px] uppercase text-white/40 block tracking-widest">
                  Data Controller
                </span>
                <p className="text-white text-xs">
                  <strong>Valeriy Khlamov</strong><br />
                  Director of Photography &amp; Filmmaker<br />
                  Base: Milan, Italy<br />
                  Direct Inquiries: <a href="mailto:valerio@vkhlamov.com" className="underline hover:text-white">valerio@vkhlamov.com</a>
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
                <span className="text-[10px] uppercase text-white/40 block tracking-widest">
                  Categories of Data Processed
                </span>
                <p className="text-white/80 text-xs">
                  • <strong>Browsing Data:</strong> IP addresses and technical security server logs automatically generated to protect infrastructure integrity.<br />
                  • <strong>Voluntarily Disclosed Data:</strong> Name, email address, and correspondence transmitted spontaneously via email or contact channels.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p>
                <strong>Purposes and Legal Grounds for Processing:</strong> Personal data is processed exclusively to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Respond to direct commercial inquiries, treatment requests, and production commissions (performance of pre-contractual and contractual measures, Art. 6.1.b GDPR).</li>
                <li>Ensure cyber-defense, brute-force mitigation, and prevention of unauthorized platform access (legitimate interest of the controller, Art. 6.1.f GDPR).</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <p>
                <strong>Data Retention:</strong> Correspondence received via email is retained only for as long as necessary to address inquiries or fulfill subsequent fiscal and professional obligations. Technical connection logs are purged or anonymized on regular cycles.
              </p>
              <p>
                <strong>Data Subject Rights (Arts. 15–22 GDPR):</strong> Users retain the right at any time to request access, rectification, erasure (the right to be forgotten), restriction of processing, data portability, or to object to processing by submitting a notice to <a href="mailto:valerio@vkhlamov.com" className="text-white underline">valerio@vkhlamov.com</a>. Users also hold the statutory right to lodge a complaint with their designated European Data Protection Supervisory Authority (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-white underline">garanteprivacy.it</a>).
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: COOKIE POLICY ── */}
        <section className="space-y-6 pt-8 border-t border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-base sm:text-lg text-white font-medium tracking-wide uppercase">
              02 {"//"} Cookie Policy (ePrivacy Directive 2002/58/EC &amp; EDPB Guidelines)
            </h2>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-white/70 font-light">
            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest block text-emerald-400">
                [ ZERO TRACKING • ZERO PROFILING COOKIES ]
              </span>
              <p>
                This website strictly <strong>does not deploy profiling cookies</strong>, behavioral tracking pixels, or invasive third-party telemetry tools (such as Google Analytics or Meta Pixel).
              </p>
            </div>

            <p>
              The platform utilizes exclusively <strong>strictly necessary technical cookies</strong>:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-white/10 text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-white/50">
                    <th className="p-2.5">Cookie Identifier</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Lifespan</th>
                    <th className="p-2.5">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/70">
                  <tr>
                    <td className="p-2.5 font-bold text-white">vkhlamov_session</td>
                    <td className="p-2.5">Technical / Security (HttpOnly, SameSite)</td>
                    <td className="p-2.5">7 days</td>
                    <td className="p-2.5">Cryptographic session authentication for studio management console (/manage). Inaccessible to client-side scripts.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-white/60">
              Pursuant to EU ePrivacy directives and regulatory guidance, <strong>no prior user consent or intrusive pop-up cookie banner is required</strong> for the deployment of purely technical cookies, this statutory notice being legally sufficient.
            </p>
          </div>
        </section>

        {/* ── SECTION 3: COPYRIGHT, INTELLECTUAL PROPERTY & TRADEMARK DISCLAIMER ── */}
        <section className="space-y-6 pt-8 border-t border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-base sm:text-lg text-white font-medium tracking-wide uppercase">
              03 {"//"} Intellectual Property &amp; Trademark Disclaimer (Fair Use / Showcase)
            </h2>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-white/70 font-light">
            <div className="space-y-2">
              <span className="text-white font-medium block uppercase tracking-wider text-[11px]">
                {"//"} Copyright &amp; Authorship of Audiovisual Works
              </span>
              <p>
                All 4K films, motion sequences, film frames, photographic stills, visual concepts, edits, color grades, and audio compositions displayed on this website are original intellectual works protected under international copyright conventions and intellectual property laws.
              </p>
              <p>
                <strong>Unauthorized reproduction, extraction, downloading, distribution, re-editing, or commercial exploitation</strong> of any content, in whole or in part, is strictly prohibited without prior written authorization from Valeriy Khlamov.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
              <span className="text-[10px] uppercase text-white/40 block tracking-widest">
                {"//"} Automotive Trademarks, Racing Liveries &amp; Directorial Showcase
              </span>
              <p className="text-white/80">
                All vehicle designs, brand names, registered trademarks, logos, racing series emblems (including FIA, WEC, Formula, GT), and team liveries featured in the video clips and photographic stills are the exclusive property of their respective owners.
              </p>
              <p className="text-white/60">
                Their inclusion within this website is strictly for <strong>documentary, artistic portfolio, and directorial demonstration purposes (Directorial Portfolio / Spec Commercial Showcase / Fair Use)</strong>. Nothing on this website shall be construed as implying endorsement, direct brand sponsorship, or commercial association unless expressly stated.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-white font-medium block uppercase tracking-wider text-[11px]">
                {"//"} Image Rights &amp; Production Disclosures
              </span>
              <p className="text-white/60">
                Audiovisual content was produced within commercial assignments, authorized trackside credentials, or official media accreditation. For any inquiries or clearance requests regarding image rights, please contact <a href="mailto:valerio@vkhlamov.com" className="text-white underline">valerio@vkhlamov.com</a> for prompt verification.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: STUDIO INFORMATION & FORMAL CONTACTS ── */}
        <section className="space-y-4 pt-8 border-t border-white/10 text-xs text-white/50">
          <div className="text-[11px] text-white/40 uppercase tracking-widest">
            {"//"} FORMAL CONTACTS &amp; STUDIO DETAILS
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-white/70">
            <div>
              <span className="text-white font-bold block">VALERIY KHLAMOV STUDIO</span>
              <span>Milan, Italy • High-Speed Pursuit &amp; Automotive Cinematography</span>
              <span className="block text-white/50">P.IVA: 18341681007</span>
            </div>
            <div className="text-left sm:text-right space-y-1">
              <div>Direct: <a href="mailto:valerio@vkhlamov.com" className="text-white underline">valerio@vkhlamov.com</a></div>
              <div className="text-[10px] text-white/40">Legal Revision: Year {currentYear}</div>
            </div>
          </div>
        </section>
      </main>

      {/* ── BOTTOM FOOTER ── */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <div>© {currentYear} VALERIY KHLAMOV • P.IVA 18341681007 — ALL RIGHTS RESERVED</div>
        <Link
          href="/"
          className="text-white/70 hover:text-white hover:italic transition-colors"
        >
          [ ← back to films ]
        </Link>
      </footer>
    </div>
  );
}
