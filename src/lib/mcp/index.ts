import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getSecurityStatus from "./tools/get-security-status";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "virtualis-nue",
  title: "Virtualis Nue",
  version: "0.1.0",
  instructions:
    "Authenticated connection to Virtualis Nue. No PHI or clinical data is exposed through this server.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getSecurityStatus],
});
