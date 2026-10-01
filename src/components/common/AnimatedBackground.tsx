/**
 * Animated Background Component
 * Provides a dynamic, non-flat background for the application:
 * - Multi-stop deep cyber-industrial gradient
 * - Smooth floating ambient glow orbs that drift and breathe (native driver 60fps)
 * - Subtle tech matrix dot grid overlay for texture and depth
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface GlowOrbProps {
  size: number;
  color: string;
  opacity: number;
  initialPos: { top?: number; left?: number; right?: number; bottom?: number };
  floatRange?: [number, number];
  driftRange?: [number, number];
  duration?: number;
  scaleRange?: [number, number];
}

const GlowOrb: React.FC<GlowOrbProps> = ({
  size,
  color,
  opacity,
  initialPos,
  floatRange = [-20, 20],
  driftRange = [-15, 15],
  duration = 4500,
  scaleRange = [0.92, 1.08],
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const driftAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftAnim, {
          toValue: 1,
          duration: duration * 1.3,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(driftAnim, {
          toValue: 0,
          duration: duration * 1.3,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: duration * 1.1,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: duration * 1.1,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    floatLoop.start();
    driftLoop.start();
    scaleLoop.start();

    return () => {
      floatLoop.stop();
      driftLoop.stop();
      scaleLoop.stop();
    };
  }, [duration, floatAnim, driftAnim, scaleAnim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: opacity,
          ...initialPos,
        },
        {
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: floatRange,
              }),
            },
            {
              translateX: driftAnim.interpolate({
                inputRange: [0, 1],
                outputRange: driftRange,
              }),
            },
            {
              scale: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: scaleRange,
              }),
            },
          ],
        },
      ]}
    />
  );
};

export const AnimatedBackground: React.FC<{
  children?: React.ReactNode;
  style?: any;
}> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {/* 1. Base Multi-stop Atmospheric Dark Gradient */}
      <LinearGradient
        colors={['#070D1D', '#0B152A', '#0D1B36', '#080E1C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Floating Ambient Glow Orbs behind content */}
      <GlowOrb
        size={width * 0.75}
        color="#0284C7"
        opacity={0.18}
        initialPos={{ top: -60, left: -60 }}
        floatRange={[-25, 25]}
        driftRange={[-20, 20]}
        duration={5000}
      />

      <GlowOrb
        size={width * 0.85}
        color="#3B82F6"
        opacity={0.15}
        initialPos={{ top: height * 0.22, right: -100 }}
        floatRange={[20, -20]}
        driftRange={[15, -15]}
        duration={6000}
      />

      <GlowOrb
        size={width * 0.7}
        color="#1E40AF"
        opacity={0.2}
        initialPos={{ top: height * 0.52, left: -80 }}
        floatRange={[-30, 20]}
        driftRange={[-15, 25]}
        duration={5500}
      />

      <GlowOrb
        size={width * 0.65}
        color="#00A3E0"
        opacity={0.15}
        initialPos={{ bottom: 30, right: -50 }}
        floatRange={[25, -25]}
        driftRange={[-20, 15]}
        duration={6500}
      />

      {/* Subtle warm amber/yellow accent fold glow - PLN Icon Plus signature */}
      <GlowOrb
        size={140}
        color="#F59E0B"
        opacity={0.08}
        initialPos={{ top: height * 0.42, right: 30 }}
        floatRange={[-15, 15]}
        driftRange={[-10, 10]}
        duration={7000}
      />

      {/* 3. Subtle Cyber Dot Matrix Grid Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern
              id="dotGrid"
              width="26"
              height="26"
              patternUnits="userSpaceOnUse"
            >
              <Circle cx="2" cy="2" r="0.9" fill="#38BDF8" fillOpacity="0.08" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dotGrid)" />
        </Svg>
      </View>

      {/* 4. Render children on top of background */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D1D',
  },
});

