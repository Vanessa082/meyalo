/** Web console: images are resized in the browser before upload. */
export const IMAGE_UPLOAD_SUPPORTED = true;

/** WebP at most `width` wide (never enlarged), quality 0.8. */
export async function resizeToWebp(file: Blob, width: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, width / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot resize images.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.8),
  );
  if (blob?.type !== 'image/webp') {
    throw new Error('This browser cannot save WebP images.');
  }
  return blob;
}
