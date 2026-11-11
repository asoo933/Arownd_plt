import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, StyleSheet, View } from "react-native";

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
  const [flights, setFlights] = useState<Flight[]>([]);
  const [reduceMotion, setReduceMotion] = useState(true);
  const flight = flights[0] ?? null;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        if (active) setReduceMotion(true);
      });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return subscribeCartFly((request) => {
      const target = getCartFlyTarget();
      if (!target) return;

      target.measure((destination) => {
        if (reduceMotion) {
          target.onArrive();
          return;
        }

        const sourceCenterX = request.source.x + request.source.width / 2;
        const sourceCenterY = request.source.y + request.source.height / 2;
        const destinationCenterX = destination.x + destination.width / 2;
        const destinationCenterY = destination.y + destination.height / 2;

        setFlights((current) => [
          ...current,
          {
            left: sourceCenterX - 22,
            top: sourceCenterY - 22,
            translateX: destinationCenterX - sourceCenterX,
            translateY: destinationCenterY - sourceCenterY,
            imageUri: request.imageUri,
            target
          }
        ]);
      });
    });
  }, [reduceMotion]);

  useEffect(() => {
    if (!flight) return;

    if (reduceMotion) {
      flight.target.onArrive();
      setFlights((current) => current[0] === flight ? current.slice(1) : current);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 620,
      useNativeDriver: true
    });

    animation.start(({ finished }) => {
      if (!finished) return;
      flight.target.onArrive();
      setFlights((current) => current[0] === flight ? current.slice(1) : current);
    });

    return () => animation.stop();
  }, [flight, progress, reduceMotion]);

  if (!flight || reduceMotion) return null;

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
