import { z } from "zod";

export const siteUrl = z.url({ protocol: /^https?$/, error: "Website URL must start with http:// or https://" });

export const sitePreviewSchema = z.object({ url: siteUrl });
