import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../constants/styles';

export type BigActionButtonProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  background: string;
};

export const BigActionButton: React.FC<BigActionButtonProps> = ({
  icon,
  title,
  description,
  onPress,
  background
}) => (
  <TouchableOpacity style={[styles.bigActionButton, { backgroundColor: background }]} onPress={onPress}>
    <View style={styles.bigActionIcon}>{icon}</View>
    <View style={styles.bigActionTextContainer}>
      <Text style={styles.bigActionTitle}>{title}</Text>
      <Text style={styles.bigActionDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);
