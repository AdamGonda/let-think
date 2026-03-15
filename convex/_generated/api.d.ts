/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as chatPipeline from "../chatPipeline.js";
import type * as embeddings from "../embeddings.js";
import type * as embeddingsMutations from "../embeddingsMutations.js";
import type * as embeddingsQueries from "../embeddingsQueries.js";
import type * as http from "../http.js";
import type * as projects from "../projects.js";
import type * as sessions from "../sessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  chatPipeline: typeof chatPipeline;
  embeddings: typeof embeddings;
  embeddingsMutations: typeof embeddingsMutations;
  embeddingsQueries: typeof embeddingsQueries;
  http: typeof http;
  projects: typeof projects;
  sessions: typeof sessions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
