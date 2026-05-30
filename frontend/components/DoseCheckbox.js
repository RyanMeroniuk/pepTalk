// Circular checkbox — empty hairline ring → filled blue with white check.
// Preserves the existing scale-pop animation (felt good in the dark theme,
// still feels good here).

import { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import Icon from './Icon';
import { COLORS, RADII } from '../theme/tokens';

const SIZE = 26;

export default function DoseCheckbox({ checked, onToggle }) {
  const scale = useRef(new Animated.Value(1)).current;
  const t = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.22, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    Animated.timing(t, {
      toValue: checked ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [checked, scale, t]);

  const backgroundColor = t.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', COLORS.bluePrimary],
  });

  const borderColor = t.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.hairline, COLORS.bluePrimary],
  });

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} hitSlop={10}>
      <Animated.View style={[styles.box, { backgroundColor, borderColor }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          {checked && (
            <View style={styles.checkWrap}>
              <Icon name="check" size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SIZE,
    height: SIZE,
    borderRadius: RADII.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
