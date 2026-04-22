import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { isEmailAllowed, normalizeEmail } from "./lib/access";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const email = normalizeEmail(args.profile.email ?? "");
      if (!email) {
        throw new Error("Email is required for sign-in");
      }
      const isAllowed = await isEmailAllowed(ctx, email);
      if (!isAllowed) {
        throw new Error("This account is not in the beta allowlist");
      }

      const {
        emailVerified: profileEmailVerified,
        phoneVerified: profilePhoneVerified,
        ...profile
      } = args.profile;
      const userData = {
        ...(profileEmailVerified ? { emailVerificationTime: Date.now() } : null),
        ...(profilePhoneVerified ? { phoneVerificationTime: Date.now() } : null),
        ...profile,
        email,
      };

      if (args.existingUserId) {
        await ctx.db.patch(args.existingUserId, userData);
        return args.existingUserId;
      }

      return await ctx.db.insert("users", userData);
    },
    async beforeSessionCreation(ctx, args) {
      const user = await ctx.db.get(args.userId);
      const email = normalizeEmail(user?.email ?? "");
      if (!email) {
        throw new Error("Email is required for sign-in");
      }
      const isAllowed = await isEmailAllowed(ctx, email);
      if (!isAllowed) {
        throw new Error("This account is not in the beta allowlist");
      }
    },
  },
});
