# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## R2 uploads

Catalog product and collection photos can now be uploaded directly from the
dashboard. The file bytes are stored in Cloudflare R2, while Supabase stores
the public file URL in `image_url`.

Uploads are optimized on the server before they are sent to R2:
- non-transparent images are resized and converted to WebP
- transparent images are resized and kept as PNG
- animated images are uploaded without conversion

Selecting a file in the form only creates a local preview. The upload to R2
happens when the user saves the product or collection.

Set these environment variables before using uploads:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=
```

`R2_PUBLIC_BASE_URL` and `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` should point at the
public base URL for your bucket or CDN. The route still works without them, but
it will only return the storage path and no public URL.
