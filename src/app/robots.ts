import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/gigs",
          "/dashboard/",
          "/onboarding/",
          "/settings/",
          "/wallet/",
          "/messages/",
          "/earnings/",
          "/studio/",
          "/notifications/",
        ],
      },
    ],
    sitemap: "https://www.examodels.com/sitemap.xml",
  };
}
