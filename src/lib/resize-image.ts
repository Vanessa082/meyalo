/** Phones: image upload lives in the web console. */
export const IMAGE_UPLOAD_SUPPORTED = false;

export async function resizeToWebp(_file: Blob, _width: number): Promise<Blob> {
  throw new Error('Add images from the web console.');
}
