/**
 * CMMS Preventive Maintenance App
 * React Native CLI + TypeScript
 */

import React, {useEffect, useState, useRef} from 'react';
import {StatusBar, View, Text, StyleSheet, Animated, Easing, AppState} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DatabaseProvider} from '@nozbe/watermelondb/DatabaseProvider';
import {AppNavigator} from './src/navigation/AppNavigator';
import {AlertProvider} from './src/components/common';
import database from './src/database';
import {seedDefaultTemplates} from './src/database/seeds';
import {useAppStore} from './src/store/appStore';
import {useInspectionStore} from './src/store/inspectionStore';
import {restoreInspectionsFromFirebase} from './src/services/syncService';
import {Colors, Typography, Spacing} from './src/theme';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <DatabaseProvider database={database}>
        <AlertProvider>
          <AppInitializer />
        </AlertProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

function AppInitializer() {
  const [isReady, setIsReady] = useState(false);
  const {setDbReady} = useAppStore();

  // Splash animations
  const iconAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const loaderAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeApp();

    // Staggered entrance
    Animated.stagger(120, [
      Animated.spring(iconAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.spring(titleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.spring(subtitleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.timing(loaderAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Pulse icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScaleAnim, {
          toValue: 1.08,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Spinning loader dots
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();

    return () => { pulse.stop(); spin.stop(); };
  }, []);

  // Auto-save draft when technician leaves app, switches apps, or locks phone
  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (nextState.match(/inactive|background/)) {
        useInspectionStore.getState().saveDraftNow().catch(() => {});
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  const initializeApp = async () => {
    try {
      await seedDefaultTemplates();
      
      setDbReady(true);
      setIsReady(true);

      restoreInspectionsFromFirebase().catch(err => {
        console.warn('Background restore on startup error:', err);
      });
    } catch (error) {
      console.error('App initialization error:', error);
      setIsReady(true);
    }
  };

  if (!isReady) {
    const spinInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.splashContainer}>
        {/* Background orbs */}
        <View style={styles.splashOrb1} />
        <View style={styles.splashOrb2} />
        <View style={styles.splashOrb3} />

        {/* Icon */}
        <Animated.View
          style={[
            styles.splashIconContainer,
            {
              opacity: iconAnim,
              transform: [
                {
                  scale: Animated.multiply(
                    pulseScaleAnim,
                    iconAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    })
                  ),
                },
              ],
            },
          ]}>
          <Text style={styles.splashIcon}>🔧</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.splashTitle,
            {
              opacity: titleAnim,
              transform: [
                {
                  translateY: titleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}>
          CMMS
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.splashSubtitle,
            {
              opacity: subtitleAnim,
              transform: [
                {
                  translateY: subtitleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}>
          Preventive Maintenance
        </Animated.Text>

        {/* Divider */}
        <Animated.View style={[styles.splashDivider, { opacity: loaderAnim }]} />

        {/* Spinner */}
        <Animated.View
          style={[
            styles.spinner,
            { opacity: loaderAnim, transform: [{ rotate: spinInterpolate }] },
          ]}
        />

        {/* Loading text */}
        <Animated.Text
          style={[
            styles.loadingText,
            {
              opacity: loaderAnim,
            },
          ]}>
          Mempersiapkan database...
        </Animated.Text>
      </View>
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  splashOrb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    top: -60,
    right: -80,
  },
  splashOrb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
    bottom: 40,
    left: -60,
  },
  splashOrb3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    bottom: 200,
    right: 20,
  },
  splashIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  splashIcon: {
    fontSize: 48,
  },
  splashTitle: {
    ...Typography.h1,
    color: Colors.text,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 4,
  },
  splashSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    letterSpacing: 1,
  },
  splashDivider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderTopColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  loader: {
    marginTop: Spacing['2xl'],
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    letterSpacing: 0.5,
  },
});

export default App;
