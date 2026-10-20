import type { Event } from '@/types/event.type';
import { Banner } from './console-ui';

/** Phones: images are added from the web console, which resizes them. */
export function CoverImageForm(_props: { event: Event }) {
  return (
    <Banner
      tone="info"
      message="Add or change the image from the web console."
    />
  );
}
