import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

import { trUpper } from '../lib/parser';
import { colors, fonts, gradients, radius } from '../theme';

type Weight = keyof typeof fonts;

export function Txt({
  weight = 'regular',
  size = 15,
  color = colors.text,
  style,
  ...rest
}: TextProps & { weight?: Weight; size?: number; color?: string }) {
  return <Text {...rest} style={[{ fontFamily: fonts[weight], fontSize: size, color }, style]} />;
}

export function Glass({ children, style, strong }: { children: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean }) {
  return <View style={[styles.glass, strong && styles.glassStrong, style]}>{children}</View>;
}

export function GradientButton({
  label,
  icon,
  onPress,
  style,
  colorsOverride,
  small,
  disabled,
}: {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  colorsOverride?: readonly [string, string, ...string[]];
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      <LinearGradient
        colors={colorsOverride ?? gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, small && styles.btnSmall]}
      >
        {icon}
        <Txt weight="bold" size={small ? 14 : 16}>
          {label}
        </Txt>
      </LinearGradient>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
  style,
  textStyle,
}: {
  label: string;
  active?: boolean;
  onPress?: PressableProps['onPress'];
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const content = (
    <>
      {icon}
      <Txt weight={active ? 'bold' : 'medium'} size={13} color={active ? colors.text : colors.textMuted} style={textStyle}>
        {label}
      </Txt>
    </>
  );
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, style]}>
      {active ? (
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.chip}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.chip, styles.chipIdle]}>{content}</View>
      )}
    </Pressable>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt weight="bold" size={13} color={colors.textMuted} style={{ letterSpacing: 1.2 }}>
        {trUpper(title)}
      </Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.lg,
  },
  glassStrong: { backgroundColor: colors.surfaceStrong, borderColor: colors.borderStrong },
  btn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
  },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  chipIdle: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 12,
  },
});
