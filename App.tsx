/**
 * CMMS Preventive Maintenance App
 * React Native CLI + TypeScript
 */

import React, {useEffect, useState, useRef} from 'react';
import {StatusBar, View, Image, StyleSheet, Animated, Easing, AppState} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DatabaseProvider} from '@nozbe/watermelondb/DatabaseProvider';
import {AppNavigator} from './src/navigation/AppNavigator';
import {AlertProvider} from './src/components/common';
import database from './src/database';
import {seedDefaultTemplates} from './src/database/seeds';
import {useAppStore} from './src/store/appStore';
import {useInspectionStore} from './src/store/inspectionStore';
import {restoreInspectionsFromFirebase} from './src/services/syncService';
import {Colors, Spacing} from './src/theme';

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

const APP_LOGO = require('./src/assets/images/app_logo.png');

function AppInitializer() {
  const [isReady, setIsReady] = useState(false);
  const {setDbReady} = useAppStore();

  // Loading animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;
  const exitScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeApp();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Breathing pulse on the icon
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.96,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    // Ripple wave 1
    const ripple1Loop = Animated.loop(
      Animated.timing(ripple1, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    ripple1Loop.start();

    // Ripple wave 2 (staggered delay)
    let ripple2Loop: Animated.CompositeAnimation | null = null;
    const ripple2Timer = setTimeout(() => {
      ripple2Loop = Animated.loop(
        Animated.timing(ripple2, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      );
      ripple2Loop.start();
    }, 900);

    return () => {
      pulseLoop.stop();
      ripple1Loop.stop();
      if (ripple2Loop) ripple2Loop.stop();
      clearTimeout(ripple2Timer);
    };
  }, []);

  // Auto-save draft when technician leaves app, switches apps, or locks phone
  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (nextState.match(/inactive|background/)) {
        const store = useInspectionStore.getState();
        if (store.activePopId) {
          store.saveDraftNow().catch(err => {
            console.warn('Auto-save draft on background error:', err);
          });
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  const initializeApp = async () => {
    const startTime = Date.now();
    try {
      await seedDefaultTemplates();
      setDbReady(true);

      restoreInspectionsFromFirebase().catch(err => {
        console.warn('Background restore on startup error:', err);
      });
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      // Pastikan animasi loading berjalan setidaknya 1.8 detik sebelum transisi
      const elapsed = Date.now() - startTime;
      const minDisplayMs = 1800;
      const delayMs = Math.max(0, minDisplayMs - elapsed);

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(exitFadeAnim, {
            toValue: 0,
            duration: 350,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(exitScaleAnim, {
            toValue: 1.15,
            duration: 350,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsReady(true);
        });
      }, delayMs);
    }
  };

  if (!isReady) {
    const rippleScale1 = ripple1.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.8],
    });
    const rippleOpacity1 = ripple1.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.55, 0.3, 0],
    });

    const rippleScale2 = ripple2.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.8],
    });
    const rippleOpacity2 = ripple2.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.55, 0.3, 0],
    });

    return (
      <View style={styles.splashContainer}>
        <Animated.View
          style={[
            styles.splashContent,
            {
              opacity: Animated.multiply(fadeAnim, exitFadeAnim),
              transform: [
                {
                  scale: Animated.multiply(
                    Animated.multiply(scaleAnim, pulseAnim),
                    exitScaleAnim,
                  ),
                },
              ],
            },
          ]}>
          {/* Ripple Ring 1 */}
          <Animated.View
            style={[
              styles.rippleRing,
              {
                transform: [{scale: rippleScale1}],
                opacity: rippleOpacity1,
              },
            ]}
          />

          {/* Ripple Ring 2 */}
          <Animated.View
            style={[
              styles.rippleRing,
              {
                transform: [{scale: rippleScale2}],
                opacity: rippleOpacity2,
              },
            ]}
          />

          {/* App Icon */}
          <View style={styles.logoCard}>
            <Image
              source={APP_LOGO}
              style={styles.appLogo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
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
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
  },
  rippleRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.45)',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  logoCard: {
    width: 110,
    height: 110,
    borderRadius: 26,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    overflow: 'hidden',
  },
  appLogo: {
    width: 90,
    height: 90,
    borderRadius: 18,
  },
});

export default App;
