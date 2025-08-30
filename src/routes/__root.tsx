import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import * as React from "react";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { LocaleProvider } from "~/components/Locales";
import { NotFound } from "~/components/NotFound";
import { seo } from "~/lib/seo";

import appCss from "../styles/app.css?url";
import { authQueries } from "~/service/queries";

interface AppRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  beforeLoad: async ({ context }) => {
    const userSession = await context.queryClient.ensureQueryData(authQueries.user());
    const user = userSession?.user || null;

    return {
      userSession: {
        user,
        isAuthenticated: !!user,
      }
    };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "theme-color",
        content: "#733e0a",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
      },
      ...seo({
        title: "Budget",
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/img/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/img/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "128x128",
        href: "/img/favicon-128x128.png",
      },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "icon", href: "/img/favicon.ico" },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <LocaleProvider>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </LocaleProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = "en";
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
