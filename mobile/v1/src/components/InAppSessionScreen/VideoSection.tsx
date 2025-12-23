import React from 'react';
import { View, ViewProps } from 'react-native';

export const VideoSection: React.FC<ViewProps> = ({ children, ...rest }) => {
  return <View {...rest}>{children}</View>;
};
