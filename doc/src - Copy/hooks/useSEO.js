// src/hooks/useSEO.js
// ─────────────────────────────────────────────────────────────────────────────
// Helper hook that builds ready-to-use JSON-LD structured data objects.
// Pass the return value directly to the SEO component's jsonLd prop.
// ─────────────────────────────────────────────────────────────────────────────

const SITE_URL = "https://alarlabs.com"; // ← change to your domain

/**
 * Builds a WebSite JSON-LD schema (good for homepage)
 */
export function useWebsiteSchema({ name, url = SITE_URL, description } = {}) {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: name || "Alar Labs",
        url,
        description,
        potentialAction: {
            "@type": "SearchAction",
            target: `${url}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
        },
    };
}

/**
 * Builds a Course JSON-LD schema
 */
export function useCourseSchema({ name, description, url, image, provider, price } = {}) {
    return {
        "@context": "https://schema.org",
        "@type": "Course",
        name,
        description,
        url: url || SITE_URL,
        image,
        provider: {
            "@type": "Organization",
            name: provider || "Alar Labs",
            url: SITE_URL,
        },
        ...(price !== undefined && {
            offers: {
                "@type": "Offer",
                price,
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
            },
        }),
    };
}

/**
 * Builds an Article / BlogPost JSON-LD schema
 */
export function useArticleSchema({
    title,
    description,
    url,
    image,
    author,
    publishedTime,
    modifiedTime,
} = {}) {
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        url: url || SITE_URL,
        image,
        datePublished: publishedTime,
        dateModified: modifiedTime || publishedTime,
        author: {
            "@type": "Person",
            name: author,
        },
        publisher: {
            "@type": "Organization",
            name: "Alar Labs",
            url: SITE_URL,
            logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/logo.png`,
            },
        },
    };
}

/**
 * Builds a BreadcrumbList JSON-LD schema
 * @param {Array<{name: string, url: string}>} items
 */
export function useBreadcrumbSchema(items = []) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

/**
 * Builds an Organization JSON-LD schema (good for About page)
 */
export function useOrganizationSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Alar Labs",
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        sameAs: [
            "https://twitter.com/alarlabs",
            "https://linkedin.com/company/alarlabs",
        ],
    };
}