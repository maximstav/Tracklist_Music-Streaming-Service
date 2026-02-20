import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Music } from "lucide-react";

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await register(formData);
            navigate("/");
        } catch (err: any) {
            setError(err.message || "Failed to register. Username or email might be taken.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900/50 p-8 rounded-lg border border-zinc-800 shadow-xl">
                <div className="flex flex-col items-center mb-8">
                    <Music className="w-12 h-12 text-green-500 mb-4" />
                    <h1 className="text-3xl font-bold">Sign up for free</h1>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-zinc-300">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            className="w-full bg-zinc-800 border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
                            placeholder="name@domain.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-zinc-300">
                            Username
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full bg-zinc-800 border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
                            placeholder="What should we call you?"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-zinc-300">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            className="w-full bg-zinc-800 border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-full transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? "Signing up..." : "Sign Up"}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-zinc-800 pt-6">
                    <p className="text-zinc-400">
                        Already have an account?{" "}
                        <Link to="/login" className="text-white hover:underline font-medium">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
