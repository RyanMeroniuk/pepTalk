import { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DoseCheckbox({ checked, onToggle }) {
  const scale = useRef(new Animated.Value(1)).current;
  const bgColor = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const isMounted = useRef(false);

  useEffect(() => {
    // Skip animation on first render
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    // Scale pop (native driver — only transforms)
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.25,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Color transition (JS driver — colors can't use native)
    Animated.timing(bgColor, {
      toValue: checked ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [checked]);

  const backgroundColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#16a34a'],
  });

  const borderColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#444', '#16a34a'],
  });

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
      {/* Outer view for color (JS-driven) */}
      <Animated.View style={[styles.box, { backgroundColor, borderColor }]}>
        {/* Inner view for scale (native-driven) */}
        <Animated.View style={[styles.inner, { transform: [{ scale }] }]}>
          {checked && <Ionicons name="checkmark" size={18} color="#fff" />}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
