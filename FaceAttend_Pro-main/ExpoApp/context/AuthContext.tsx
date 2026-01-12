// import { createContext, useContext, useState } from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// // type User = {
// //   userId: string;
// //   name: string;
// //   email: string;
// // };
// type User = {
//   id: string;
//   name: string;
//   email: string;
//   role: "manager" | "employee";
//   token: string;
// };


// const AuthContext = createContext<any>(null);

// export const AuthProvider = ({ children }: any) => {
//   const [user, setUser] = useState<User | null>(null);

//   const login = async (data: any) => {
//   await AsyncStorage.setItem("user", JSON.stringify(data.user));
//   setUser(data.user);
// };
//   const logout = () => setUser(null);

//   return (
//     <AuthContext.Provider value={{ user, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
  _id: string;
  name: string;
  role: "manager" | "employee";
  token?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (data: any) => {
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
