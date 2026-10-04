import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors } from '../theme';
import { Txt } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({ done, total, size = 88 }: { done: number; total: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(anim, { toValue: pct, useNativeDriver: false, speed: 8, bounciness: 4 }).start();
  }, [anim, pct]);

  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={pct === 1 ? colors.mint : colors.cyan} />
            <Stop offset="1" stopColor={pct === 1 ? colors.cyan : colors.pink} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <Txt weight="extrabold" size={size * 0.24}>
        {total ? `${Math.round(pct * 100)}%` : '—'}
      </Txt>
      <Txt size={10} color={colors.textMuted} weight="semibold">
        {done}/{total}
      </Txt>
    </View>
  );
}
