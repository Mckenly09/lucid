import { Image } from 'react-native';

const sizes = { sm: 'h-8 w-7', md: 'h-28 w-24', lg: 'h-36 w-32' } as const;

export function Logo({ size = 'md' }: { size?: keyof typeof sizes }) {
  return (
    <Image
      source={require('@/assets/images/logo-transparent.png')}
      resizeMode="contain"
      className={sizes[size]}
      accessibilityLabel="Lucid logo"
    />
  );
}
