import * as React from "react";
import { createAuthEmailHandler } from "@lovable.dev/email-js";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import { buildAuthLinkUrl } from "@/lib/recovery";

// Configuration
const SITE_NAME = "Virtualis Nue";
const SENDER_DOMAIN = "notify.virtualischat.com";
const ROOT_DOMAIN = "virtualischat.com";
const FROM_DOMAIN = "virtualischat.com";
const SITE_URL = `https://${ROOT_DOMAIN}`;

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const handler = createAuthEmailHandler({
          apiKey: process.env["LOVABLE_API_KEY"]!,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          senderDomain: SENDER_DOMAIN,
          sendUrl: process.env["LOVABLE_SEND_URL"],
          emails: {
            signup: {
              subject: "Confirm your email",
              render: (data) =>
                React.createElement(SignupEmail, {
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  recipient: data.email,
                  confirmationUrl: data.url,
                }),
            },
            invite: {
              subject: "You've been invited",
              render: (data) =>
                React.createElement(InviteEmail, {
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  // First-party link: the one-time code rides in the fragment
                  // and is redeemed only by a deliberate click on our page,
                  // so a mailbox scanner cannot burn the invitation.
                  confirmationUrl: buildAuthLinkUrl(SITE_URL, {
                    type: "invite",
                    email: data.email,
                    token: data.token,
                    fallbackUrl: data.url,
                  }),
                }),
            },
            magiclink: {
              subject: "Your login link",
              render: (data) =>
                React.createElement(MagicLinkEmail, {
                  siteName: SITE_NAME,
                  confirmationUrl: data.url,
                }),
            },
            recovery: {
              subject: "Reset your password",
              render: (data) =>
                React.createElement(RecoveryEmail, {
                  siteName: SITE_NAME,
                  confirmationUrl: buildAuthLinkUrl(SITE_URL, {
                    type: "recovery",
                    email: data.email,
                    token: data.token,
                    fallbackUrl: data.url,
                  }),
                }),
            },
            email_change: {
              subject: "Confirm your new email",
              render: (data) =>
                React.createElement(EmailChangeEmail, {
                  siteName: SITE_NAME,
                  oldEmail: data.old_email ?? "",
                  email: data.email,
                  newEmail: data.new_email ?? "",
                  confirmationUrl: data.url,
                }),
            },
            reauthentication: {
              subject: "Your verification code",
              render: (data) =>
                React.createElement(ReauthenticationEmail, { token: data.token ?? "" }),
            },
          },
        });
        return handler(request);
      },
    },
  },
});
