import { createContext, useState, useEffect } from "react";
import API from "../services/api"; 

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Listen for background 401 unauthenticated interceptor events
        const handleGlobalLogout = () => {
            localStorage.removeItem('token');
            setUser(null);
        };

        window.addEventListener('auth-logout', handleGlobalLogout);

        // 2. Existing profile context checking setup
        const token = localStorage.getItem('token');
        if (token) {
            API.get("/auth/me")
                .then((res) => setUser(res.data))
                .catch(() => localStorage.removeItem('token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }

        // Clean up event listener when component unmounts
        return () => {
            window.removeEventListener('auth-logout', handleGlobalLogout);
        };
    }, []);

    const login = async (email, password) => {
        const res = await API.post("/auth/login", { email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (username, email, password, role, location) => {
        const res = await API.post("/auth/register", { 
            username, 
            email, 
            password, 
            role, 
            location 
        });
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
