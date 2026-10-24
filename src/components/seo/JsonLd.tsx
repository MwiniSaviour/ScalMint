const SITE = "https://scalmint.com";
const AFFILIATE = "https://affiliate.scalmint.com";

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "ScalMint",
      legalName: "ScalMint",
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/scalmint_logo.png`,
      },
      email: "support@scalmint.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Accra",
        addressCountry: "GH",
      },
      areaServed: { "@type": "Country", name: "Ghana" },
      knowsAbout: [
        "software development",
        "AI automation",
        "digital transformation",
        "point of sale",
        "operations software",
      ],
      makesOffer: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "SoftwareApplication",
            name: "Nova POS",
            url: "https://pos.scalmint.com",
            applicationCategory: "BusinessApplication",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "SoftwareApplication",
            name: "Operasch",
            url: "https://smartsos.cloud",
            applicationCategory: "BusinessApplication",
          },
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "ScalMint",
      description:
        "Software, data and AI for digital transformation. We turn business needs into working software.",
      publisher: { "@id": `${SITE}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "WebPage",
      "@id": `${SITE}/#webpage`,
      url: SITE,
      name: "ScalMint — Software, Data & AI for digital transformation",
      isPartOf: { "@id": `${SITE}/#website` },
      about: { "@id": `${SITE}/#organization` },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${SITE}/scalmint_logo.png`,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${AFFILIATE}/#website`,
      url: AFFILIATE,
      name: "ScalMint Affiliate Program",
      description:
        "Earn recurring commission promoting Nova POS, Operasch, Jarvis and JobFinder. Payouts via Paystack to MTN MoMo in Ghana.",
      publisher: { "@id": `${SITE}/#organization` },
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
