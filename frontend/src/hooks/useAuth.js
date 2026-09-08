import { useDispatch, useSelector } from "react-redux";
import client from "@/api/client";
import { resetQueryCache } from "@/api/resetQueryCache";
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

  const completeLogin = async (accessToken) => {
    dispatch(setCredentials({ accessToken, user: null }));
    await resetQueryCache();

    const userRes = await client.get("/users/me");
    dispatch(setCredentials({ accessToken, user: userRes.data }));
  };

  const login = async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    await completeLogin(res.data.access_token);
  };

  const logout = async () => {
    await resetQueryCache();
    dispatch(clearCredentials());
  };

  const signup = async (name, email, password) => {
    await client.post("/auth/signup", { name, email, password });
  };

  const resendVerification = async (email) => {
    return await client.post("/auth/resend-verification", { email });
  };

  const checkEmail = async (email) => {
    const res = await client.post("/auth/check-email", { email });
    return res.data;
  };

  const forgotPassword = async (email) => {
    const res = await client.post("/auth/forgot-password", { email });
    return res.data;
  };

  const verifyEmail = async (token) => {
    const res = await client.get("/auth/verify", { params: { token } });
    return res.data;
  };

  const emailLogin = async (token) => {
    const res = await client.get("/auth/email-login", { params: { token } });
    await completeLogin(res.data.access_token);
  };

  return {
    isAuthenticated,
    user,
    completeLogin,
    login,
    logout,
    signup,
    resendVerification,
    checkEmail,
    forgotPassword,
    verifyEmail,
    emailLogin,
  };
}
