import { z } from "zod";

const siteUrl = z.url({ protocol: /^https?$/, error: "Website URL must start with http:// or https://" });

const sitePreviewSchema = z.object({ url: siteUrl });

export { siteUrl, sitePreviewSchema };
