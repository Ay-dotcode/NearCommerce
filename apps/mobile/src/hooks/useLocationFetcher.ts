import * as Location from "expo-location";
import { useEffect, useState } from "react";

export function useLocationFetcher() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [isFetching, setIsFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsFetching(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        setIsFetching(false);
        return;
      }

      let fetchedLocation = await Location.getCurrentPositionAsync({});
      setLocation(fetchedLocation);
      setIsFetching(false);
    })();
  }, []);

  return { location, isFetching, errorMsg };
}
