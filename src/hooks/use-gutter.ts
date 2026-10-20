import { useWindowDimensions } from 'react-native';
import { Layout } from '@/theme';

export function useGutter(): number {
  const { width } = useWindowDimensions();
  return width >= Layout.wideFrom ? Layout.gutterWide : Layout.gutter;
}
