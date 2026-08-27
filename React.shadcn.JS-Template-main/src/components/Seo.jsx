// src/components/seo/SEO.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Universal SEO component — drop it into any page/route component.
// Handles: title, meta description, Open Graph, Twitter Cards, canonical URL,
//          robots, structured data (JSON-LD), and language.
//
// Install first:  npm install react-helmet-async
// Then wrap your app root with <HelmetProvider> (see main.jsx example below)
// ─────────────────────────────────────────────────────────────────────────────
import { Helmet } from "react-helmet-async";
import { usePlatformSettingsOptional } from "@/context/PlatformSettingsContext";

const DEFAULT_SITE = {
    name: "Alar Labs",
    url: "https://alarlabs.com",           // ← your domain
    logo: "https://alarlabs.com/logo.png",  // ← your OG image
    twitterHandle: "@alarlabs",                       // ← your Twitter/X handle
    locale: "en_US",
};

/**
 * SEO Component
 *
 * @param {string}  title         - Page title (appended with site name)
 * @param {string}  description   - Meta description (max ~160 chars)
 * @param {string}  canonical     - Canonical URL (defaults to window.location.href)
 * @param {string}  image         - OG image URL (1200×630 recommended)
 * @param {string}  type          - OG type: "website" | "article" | "profile"
 * @param {string}  robots        - Robots directive e.g. "noindex,nofollow"
 * @param {object}  article       - Article-specific metadata (for blog posts)
 * @param {object}  jsonLd        - Custom JSON-LD structured data object
 * @param {boolean} noTitleSuffix - Don't append site name to title
 */
const SEO = ({
    title,
    description = "Alar Labs — Modern learning platform for courses, labs, and digital programs.",
    canonical,
    image = DEFAULT_SITE.logo,
    type = "website",
    robots = "index,follow",
    article = null,
    jsonLd = null,
    noTitleSuffix = false,
}) => {
    const platform = usePlatformSettingsOptional();
    const siteName = platform?.siteName || DEFAULT_SITE.name;
    const siteDescription = platform?.siteDescription || description;

    const siteTitle = noTitleSuffix
        ? title
        : title
            ? `${title} | ${siteName}`
            : siteName;

    const canonicalUrl =
        canonical ||
        (typeof window !== "undefined" ? window.location.href : DEFAULT_SITE.url);

    return (
        <Helmet prioritizeSeoTags>
            {/* ── Basic ── */}
            <html lang="en" />
            <title>{siteTitle}</title>
            <meta name="description" content={siteDescription} />
            <meta name="robots" content={robots} />
            <link rel="canonical" href={canonicalUrl} />

            {/* ── Open Graph (Facebook, LinkedIn, WhatsApp previews) ── */}
            <meta property="og:site_name" content={siteName} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={siteDescription} />
            <meta property="og:image" content={image} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:type" content={type} />
            <meta property="og:locale" content={DEFAULT_SITE.locale} />

            {/* ── Twitter / X Cards ── */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content={DEFAULT_SITE.twitterHandle} />
            <meta name="twitter:title" content={siteTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* ── Article-specific tags (blog posts, news) ── */}
            {article?.publishedTime && (
                <meta property="article:published_time" content={article.publishedTime} />
            )}
            {article?.modifiedTime && (
                <meta property="article:modified_time" content={article.modifiedTime} />
            )}
            {article?.author && (
                <meta property="article:author" content={article.author} />
            )}
            {article?.section && (
                <meta property="article:section" content={article.section} />
            )}
            {article?.tags?.map((tag) => (
                <meta property="article:tag" content={tag} key={tag} />
            ))}

            {/* ── JSON-LD Structured Data (Google rich results) ── */}
            {jsonLd && (
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            )}
        </Helmet>
    );
};

export default SEO;