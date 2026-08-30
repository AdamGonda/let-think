/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chatPipeline from "../chatPipeline.js";
import type * as chatSessions from "../chatSessions.js";
import type * as conceptEmbeddings from "../conceptEmbeddings.js";
import type * as conceptEmbeddingsActions from "../conceptEmbeddingsActions.js";
import type * as constants from "../constants.js";
import type * as featureFlags from "../featureFlags.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_sessionOwned from "../lib/sessionOwned.js";
import type * as lib_transactionalEmails_resend from "../lib/transactionalEmails/resend.js";
import type * as lib_transactionalEmails_templates from "../lib/transactionalEmails/templates.js";
import type * as modelConfig from "../modelConfig.js";
import type * as projects from "../projects.js";
import type * as sessions from "../sessions.js";
import type * as transactionalEmails from "../transactionalEmails.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  chat: typeof chat;
  chatPipeline: typeof chatPipeline;
  chatSessions: typeof chatSessions;
  conceptEmbeddings: typeof conceptEmbeddings;
  conceptEmbeddingsActions: typeof conceptEmbeddingsActions;
  constants: typeof constants;
  featureFlags: typeof featureFlags;
  files: typeof files;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/sessionOwned": typeof lib_sessionOwned;
  "lib/transactionalEmails/resend": typeof lib_transactionalEmails_resend;
  "lib/transactionalEmails/templates": typeof lib_transactionalEmails_templates;
  modelConfig: typeof modelConfig;
  projects: typeof projects;
  sessions: typeof sessions;
  transactionalEmails: typeof transactionalEmails;
  users: typeof users;
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
