"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
export default function LoginPage() {
  const router = useRouter(); // ho

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      localStorage.setItem("token", res.data.token); // lưu token nếu cần
      setMessage("Login successful!");

      router.push("/chart"); // redirect sau khi login
    } catch (err) {
      //console.error(err.response?.data || err.message);
      setMessage("Login failed: ");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Login Demo</h1>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ display: "block", marginBottom: "10px" }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: "10px" }}
      />
      <button onClick={handleLogin} style={{ marginRight: "10px" }}>
        Login
      </button>
      <p>{message}</p>
    </div>
  );
}
