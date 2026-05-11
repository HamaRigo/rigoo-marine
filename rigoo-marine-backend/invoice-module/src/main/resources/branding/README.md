# PDF branding assets

Drop these files here and the invoice + quotation PDF generators pick them up automatically. No code change, no env var — they're loaded as classpath resources at runtime.

| File | Used as | Recommended dimensions |
|---|---|---|
| `logo.png` | Top-left of every invoice and quotation PDF (header) | 300×120, transparent PNG |
| `stamp.png` | Right-aligned above the footer of every invoice and quotation PDF (signature/seal area) | 200×200, transparent PNG |

Both are optional:
- If `logo.png` is missing **and** the request didn't pass a per-invoice `logoUrl`, the PDF falls back to a text "RIGOO MARINE" header.
- If `stamp.png` is missing, the stamp section is omitted entirely (no broken image, no error).

After dropping the files in, rebuild the `invoice-module` Docker image (or restart the JVM if running locally with `mvn spring-boot:run`) — classpath resources are bundled at build time.

To preview without rebuilding (dev only): the PNGs are served from the classpath, so simply restarting `invoice-service` is enough as long as the resources directory is on the classpath (Spring Boot picks up `src/main/resources/` automatically in dev mode).
