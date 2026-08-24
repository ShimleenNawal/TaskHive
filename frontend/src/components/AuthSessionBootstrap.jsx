import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import client from "@/api/client";
import {
  clearCredentials,
  selectAccessToken,
  setUser,
} from "@/store/authSlice";

/**
 * After Redux Persist rehydrates a session, quietly refresh /users/me.
 * Does not block routing — persisted token + user keep the UI fast.
 */
export default function AuthSessionBootstrap() {
  const dispatch = useDispatch();
  const accessToken = useSelector(selectAccessToken);
  const rehydrated = useSelector((state) => state.auth._persist?.rehydrated);

  useEffect(() => {
    if (!rehydrated || !accessToken) return;

    let cancelled = false;

    client
      .get("/users/me")
      .then((res) => {
        if (!cancelled) {
          dispatch(setUser(res.data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch(clearCredentials());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rehydrated, accessToken, dispatch]);

  return null;
}
