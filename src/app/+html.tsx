import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { themeStylesheet } from '@/theme/css-vars';

/**
 * The root HTML of every static web page (runs in Node at export time only).
 * It carries both colour palettes as CSS variables, so the page opens in the
 * visitor's light or dark theme before any script runs.
 */
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } =
    useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        {/* Static and trusted: built from src/theme/colors.ts. */}
        <style
          id="meyalo-theme"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: CSS built at export time from our own colour table, no user input
          dangerouslySetInnerHTML={{ __html: themeStylesheet() }}
        />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
