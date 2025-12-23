import React from 'react';
import { View, ViewProps } from 'react-native';

export const StatusSection: React.FC<ViewProps> = ({ children, ...rest }) => {
  return <View {...rest}>{children}</View>;
};
