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
          "/dashboard/",
          "/onboarding/",
          "/settings/",
          "/wallet/",
          "/messages/",
          "/studio/",
          "/earnings/",
          "/content/",
          "/notifications/",
        ],
      },
    ],
    sitemap: "https://www.examodels.com/sitemap.xml",
  };
}
