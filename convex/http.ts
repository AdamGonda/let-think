import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { spotifyOAuthCallback } from "./spotifyHttp";

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({
  path: "/spotify/callback",
  method: "GET",
  handler: spotifyOAuthCallback,
});
export default http;
