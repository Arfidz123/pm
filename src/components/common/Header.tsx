/**
 * Header Component
 * Premium glassmorphic header with animated back button, floating orb graphics,
 * overline label, and glowing gradient accent — matching Home & History aesthetics.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  overline?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  children?: React.ReactNode;
}

const FloatingOrb: React.FC<{
  size: number;
  color: string;
  style: any;
}> = ({ size, color, style }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    float.start();
    return () => float.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.12,
        },
        style,
        {
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10],
              }),
            },
          ],
        },
      ]}
    />
  );
};

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  overline,
  onBack,
  rightAction,
  transparent = false,
  children,
}) => {
  // Entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current;
  // Back button press animation
  const backScaleAnim = useRef(new Animated.Value(1)).current;
  // Title slide animation
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        delay: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBackPressIn = () => {
    Animated.spring(backScaleAnim, {
      toValue: 0.88,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBackPressOut = () => {
    Animated.spring(backScaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const overlineText = overline || '';

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.backgroundSecondary}
      />
      <Animated.View
        style={[
          styles.wrapper,
          {
            opacity: entranceAnim,
            transform: [
              {
                translateY: entranceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={
            transparent
              ? ['transparent', 'transparent']
              : [Colors.backgroundSecondary, Colors.background]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gradient, transparent && styles.transparent]}
        >
          {!transparent && (
            <>
              <FloatingOrb
                size={100}
                color="#3B82F6"
                style={{ top: -30, right: -10 }}
              />
              <FloatingOrb
                size={60}
                color="#60A5FA"
                style={{ top: 15, right: 90 }}
              />
            </>
          )}

          <View style={styles.topRow}>
            {onBack && (
              <Animated.View style={{ transform: [{ scale: backScaleAnim }] }}>
                <TouchableOpacity
                  onPress={onBack}
                  onPressIn={handleBackPressIn}
                  onPressOut={handleBackPressOut}
                  style={styles.backBtn}
                  activeOpacity={1}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <ChevronLeft color={Colors.white} size={22} />
                </TouchableOpacity>
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.titleContainer,
                {
                  opacity: titleAnim,
                  transform: [
                    {
                      translateX: titleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-15, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {overlineText ? (
                <Text style={styles.overline}>{overlineText}</Text>
              ) : null}
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </Animated.View>

            {rightAction && (
              <Animated.View
                style={[
                  styles.rightSection,
                  {
                    opacity: titleAnim,
                    transform: [
                      {
                        scale: titleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.85, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {rightAction}
              </Animated.View>
            )}
          </View>

          {children && (
            <Animated.View
              style={[styles.childrenContainer, { opacity: entranceAnim }]}
            >
              {children}
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 10,
  },
  childrenContainer: {
    marginTop: Spacing.md,
  },
  gradient: {
    paddingTop: 52,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  overline: {
    ...Typography.overline,
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    ...Typography.h3,
    color: Colors.white,
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: 0.3,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rightSection: {
    marginLeft: Spacing.sm,
  },
});
