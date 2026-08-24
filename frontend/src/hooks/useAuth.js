import { useDispatch, useSelector } from "react-redux";
import client from "@/api/client";
import {
  clearCredentials,
  selectIsAuthenticated,
  selectUser,
  setCredentials,
} from "@/store/authSlice";

export function useAuth() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  const login = async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    const accessToken = res.data.access_token;

    // Store token first so the interceptor can authorize /users/me
    dispatch(setCredentials({ accessToken, user: null }));

    const userRes = await client.get("/users/me");
    dispatch(setCredentials({ accessToken, user: userRes.data }));
  };

  const logout = () => {
    dispatch(clearCredentials());
  };

  const signup = async (name, email, password) => {
    await client.post("/auth/signup", { name, email, password });
  };

  const resendVerification = async (email) => {
    return await client.post("/auth/resend-verification", { email });
  };

  return {
    isAuthenticated,
    user,
    login,
    logout,
    signup,
    resendVerification,
  };
}
