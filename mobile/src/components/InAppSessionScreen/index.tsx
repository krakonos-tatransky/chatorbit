import React from 'react';
import { View, ViewProps } from 'react-native';

export const InAppSessionScreen: React.FC<ViewProps> = ({ children, ...rest }) => {
  return <View {...rest}>{children}</View>;
};

export * from './ChatSection';
export * from './VideoSection';
export * from './StatusSection';
