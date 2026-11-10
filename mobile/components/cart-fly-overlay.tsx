import { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useAppTheme } from "@/lib/theme";
import { getCartFlyTarget, subscribeCartFly, type CartFlyTarget } from "@/lib/cart-fly";

type Flight = {
  left: number;
  top: number;
  translateX: number;
  translateY: number;
  imageUri: string | null;
  target: CartFlyTarget;
};

export function CartFlyOverlay() {
  const theme = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const [flight, setFlight] = useState<Flight | null>(null);

  useEffect(() => {
    return subscribeCartFly((request) => {
      const target = getCartFlyTarget();
      if (!target) return;

      target.measure((destination) => {
        const sourceCenterX = request.source.x + request.source.width / 2;
        const sourceCenterY = request.source.y + request.source.height / 2;
        const destinationCenterX = destination.x + destination.width / 2;
        const destinationCenterY = destination.y + destination.height / 2;

        setFlight({
          left: sourceCenterX - 22,
          top: sourceCenterY - 22,
          translateX: destinationCenterX - sourceCenterX,
          translateY: destinationCenterY - sourceCenterY,
          imageUri: request.imageUri,
          target
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!flight) return;

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 620,
      useNativeDriver: true
    });

    animation.start(({ finished }) => {
      if (!finished) return;
      flight.target.onArrive();
      setFlight(null);
    });

    return () => animation.stop();
  }, [flight, progress]);

  if (!flight) return null;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, flight.translateX]
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, flight.translateY]
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.92, 0.72, 0.34]
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [1, 1, 0.15]
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.flight,
          {
            left: flight.left,
            top: flight.top,
            backgroundColor: theme.colors.accent,
            transform: [{ translateX }, { translateY }, { scale }],
            opacity
          }
        ]}
      >
        {flight.imageUri ? (
          <Image source={{ uri: flight.imageUri }} resizeMode="cover" style={styles.image} />
        ) : (
          <Icon name="shopping-bag" size={22} color={theme.colors.accentForeground} accessibilityHidden />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flight: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    zIndex: 1000
  },
  image: {
    width: "100%",
    height: "100%"
  }
});
