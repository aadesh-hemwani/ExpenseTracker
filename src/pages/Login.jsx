import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { googleSignIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-black px-6 transition-colors duration-200">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-2 tracking-tighter text-gray-900 dark:text-white">Expenses.</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Minimalist tracking for daily life.</p>

        <button
          onClick={googleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-[0.98]"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="font-semibold text-gray-700 dark:text-white">Continue with Google</span>
        </button>
      </div>
    </div>
  );
};

export default Login;