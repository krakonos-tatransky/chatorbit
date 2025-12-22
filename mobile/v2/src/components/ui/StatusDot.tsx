/**
 * StatusDot Component
 *
 * Connection status indicator with color-coded states.
 * Green = connected, Orange = waiting, Red = error/disconnected.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../../constants';

export type StatusType = 'connected' | 'waiting' | 'error' | 'offline';

export interface StatusDotProps {
  /** Connection status */
  status: StatusType;
  /** Size of the dot (default: 12) */
  size?: number;
  /** Custom style */
  style?: ViewStyle;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  size = 12,
  style,
}) => {
  const dotColor = STATUS_COLORS[status];

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColor,
        },
        style,
      ]}
    />
  );
};

const STATUS_COLORS: Record<StatusType, string> = {
  connected: COLORS.status.success,
  waiting: COLORS.status.warning,
  error: COLORS.status.error,
  offline: COLORS.text.disabled,
};

const styles = StyleSheet.create({
  dot: {
    // Base styles defined inline for dynamic sizing
  },
});

export default StatusDot;
