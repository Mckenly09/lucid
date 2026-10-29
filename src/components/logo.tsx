import { Image } from 'expo-image';
import { styled } from 'nativewind';

// expo-image, not RN Image: react-native-web's Image sets the file's 1024px size inline, overriding className.
const StyledImage = styled(Image, { className: 'style' });

// The app icon tile, as in every design file (corner radius rounded to the nearest token).
const sizes = { sm: 'h-7 w-7 rounded-sm', auth: 'h-12 w-12 rounded-md', md: 'h-24 w-24 rounded-lg', lg: 'h-30 w-30 rounded-lg' } as const;

export function Logo({ size = 'md' }: { size?: keyof typeof sizes }) {
  return (
    <StyledImage
      source={require('@/assets/images/icon.png')}
      contentFit="cover"
      className={sizes[size]}
      accessibilityLabel="Lucid logo"
    />
  );
}
