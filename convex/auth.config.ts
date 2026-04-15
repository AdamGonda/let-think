const isLocalDev = process.env.NODE_ENV !== "production";
const localSiteUrl = process.env.SITE_URL;

export default {
  providers: [
    {
      domain: isLocalDev && localSiteUrl ? localSiteUrl : process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
