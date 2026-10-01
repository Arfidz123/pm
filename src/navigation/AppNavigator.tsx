/**
 * Main App Navigator
 * Stack navigator + Bottom tab navigator
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { Home, History } from 'lucide-react-native';

// Screens
import { DashboardScreen } from '../screens/home/DashboardScreen';
import { StartInspectionScreen } from '../screens/inspection/StartInspectionScreen';
import { CapturePhotoScreen } from '../screens/inspection/CapturePhotoScreen';
import { ChecklistScreen } from '../screens/inspection/ChecklistScreen';
import { ReviewScreen } from '../screens/inspection/ReviewScreen';
import { SignatureScreen } from '../screens/inspection/SignatureScreen';
import { SelectPopScreen } from '../screens/inspection/SelectPopScreen';
import { AddPopScreen } from '../screens/inspection/AddPopScreen';
import { InfoPopScreen } from '../screens/inspection/InfoPopScreen';
import { HistoryScreen } from '../screens/history/HistoryScreen';
import { InspectionDetailScreen } from '../screens/history/InspectionDetailScreen';
import { HistoryReviewPdfScreen } from '../screens/history/HistoryReviewPdfScreen';

import { CategoryFormScreen } from '../screens/inspection/CategoryFormScreen';
import { KwhMeterScreen } from '../screens/inspection/KwhMeterScreen';
import { AcpdbScreen } from '../screens/inspection/AcpdbScreen';
import { DcpdbScreen } from '../screens/inspection/DcpdbScreen';
import { RectifierScreen } from '../screens/inspection/RectifierScreen';
import { PowerSystemScreen } from '../screens/inspection/PowerSystemScreen';
import { GensetScreen } from '../screens/inspection/GensetScreen';
import { BatteryScreen } from '../screens/inspection/BatteryScreen';
import { MechanicalElectScreen } from '../screens/inspection/MechanicalElectScreen';
import { DokumentasiScreen } from '../screens/inspection/DokumentasiScreen';
import { ReviewPdfScreen } from '../screens/inspection/ReviewPdfScreen';
import { ExternalAlarmScreen } from '../screens/inspection/ExternalAlarmScreen';
import { FotIpScreen } from '../screens/inspection/FotIpScreen';
import { useInspectionStore } from '../store/inspectionStore';
import { FotDwdmScreen } from '../screens/inspection/FotDwdmScreen';

import type { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab bar icon component with spring animation
const TabIcon: React.FC<{
  IconComponent: any;
  focused: boolean;
  label: string;
}> = ({ IconComponent, focused, label }) => {
  const activeColor = '#3B82F6';
  const scaleAnim = React.useRef(
    new Animated.Value(focused ? 1.15 : 1),
  ).current;
  const opacityAnim = React.useRef(
    new Animated.Value(focused ? 1 : 0.6),
  ).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.18 : 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={tabStyles.container}>
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
      >
        <IconComponent
          color={focused ? activeColor : Colors.textMuted}
          size={24}
        />
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[
          tabStyles.label,
          focused
            ? { color: activeColor, fontWeight: 'bold' }
            : { color: Colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    paddingTop: 8,
  },
  label: {
    ...Typography.overline,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.backgroundSecondary,
          borderTopColor: Colors.glassBorder,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 12,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={Home} focused={focused} label="Beranda" />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconComponent={History}
              focused={focused}
              label="Riwayat"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const newInspectionStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: Colors.backgroundSecondary,
  },
  icon: {
    fontSize: 28,
    color: Colors.white,
    lineHeight: 30,
  },
});

// Root Stack Navigator
export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenListeners={{
          beforeRemove: () => {
            useInspectionStore.getState().saveDraftNow().catch(() => {});
          },
        }}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
          animationDuration: 300,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="StartInspection"
          component={StartInspectionScreen}
        />
        <Stack.Screen name="CapturePhoto" component={CapturePhotoScreen} />
        <Stack.Screen name="Checklist" component={ChecklistScreen} />
        <Stack.Screen name="Review" component={ReviewScreen} />
        <Stack.Screen name="Signature" component={SignatureScreen} />
        <Stack.Screen name="CategoryForm" component={CategoryFormScreen} />
        <Stack.Screen name="KwhMeter" component={KwhMeterScreen} />
        <Stack.Screen name="Acpdb" component={AcpdbScreen} />
        <Stack.Screen name="Dcpdb" component={DcpdbScreen} />
        <Stack.Screen name="Rectifier" component={RectifierScreen} />
        <Stack.Screen name="PowerSystem" component={PowerSystemScreen} />
        <Stack.Screen name="Genset" component={GensetScreen} />
        <Stack.Screen name="Battery" component={BatteryScreen} />
        <Stack.Screen
          name="MechanicalElect"
          component={MechanicalElectScreen}
        />
        <Stack.Screen name="Dokumentasi" component={DokumentasiScreen} />
        <Stack.Screen name="ExternalAlarm" component={ExternalAlarmScreen} />
        <Stack.Screen name="FotIp" component={FotIpScreen} />
        <Stack.Screen name="FotDwdm" component={FotDwdmScreen} />
        <Stack.Screen name="ReviewPdf" component={ReviewPdfScreen} />
        <Stack.Screen name="SelectPop" component={SelectPopScreen} />
        <Stack.Screen name="AddPop" component={AddPopScreen} />
        <Stack.Screen name="InfoPop" component={InfoPopScreen} />
        <Stack.Screen
          name="InspectionDetail"
          component={InspectionDetailScreen}
        />
        <Stack.Screen
          name="HistoryReviewPdf"
          component={HistoryReviewPdfScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
