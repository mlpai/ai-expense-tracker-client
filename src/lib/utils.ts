// Utility functions for authentication and user data

export const getAuthToken = (): string | null => {
  return localStorage.getItem("token");
};

export const getUserFromStorage = (): any => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return null;
  }
};

export const getUserId = (): string | null => {
  const user = getUserFromStorage();
  return user?.id || null;
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token;
};

export const logout = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

export const requireAuth = (): void => {
  if (!isAuthenticated()) {
    logout();
  }
};
