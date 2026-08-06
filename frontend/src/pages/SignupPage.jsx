import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" }); // clear error on change
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name required";
    if (!formData.email) newErrors.email = "Email required";
    if (formData.password.length < 8) newErrors.password = "Min 8 chars";
    if (!/[a-zA-Z]/.test(formData.password))
      newErrors.password = "Need at least 1 letter";
    if (!/[0-9]/.test(formData.password))
      newErrors.password = "Need at least 1 digit";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await signup(formData.name, formData.email, formData.password);
      setSuccess(true);
    } catch (error) {
      setErrors({
        submit: error.response?.data?.detail || "Signup failed",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <h2>Check your email!</h2>
        <p>We sent a verification link to {formData.email}</p>
        <button onClick={() => navigate("/login")}>Go to login</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
        />
        {errors.name && <p style={{ color: "red" }}>{errors.name}</p>}

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}

        <input
          type="password"
          name="password"
          placeholder="Password (min 8 chars, 1 letter + 1 digit)"
          value={formData.password}
          onChange={handleChange}
        />
        {errors.password && <p style={{ color: "red" }}>{errors.password}</p>}

        {errors.submit && <p style={{ color: "red" }}>{errors.submit}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
      <p>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </div>
  );
}
