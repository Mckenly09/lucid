import { type AndroidSymbol, type SFSymbol, SymbolView, type SymbolViewProps } from 'expo-symbols';
import { styled } from 'nativewind';

// Lets icons take token colors from className (text-ink, text-success…) instead of a hex tintColor.
const StyledSymbol = styled(SymbolView, {
  className: { target: 'style', nativeStyleMapping: { color: 'tintColor' } },
});

type Props = Omit<SymbolViewProps, 'name'> & {
  ios: SFSymbol;
  android: AndroidSymbol;
  className?: string;
};

export function Icon({ ios, android, size = 20, className = 'text-ink', ...rest }: Props) {
  return (
    <StyledSymbol
      name={{ ios, android, web: android }}
      size={size}
      className={className}
      accessibilityElementsHidden
      importantForAccessibility="no"
      {...rest}
    />
  );
}
