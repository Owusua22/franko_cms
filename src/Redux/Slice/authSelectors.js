// src/Redux/Slice/authSelectors.js
export const selectAuth = (state) => state.user;

export const selectIsAuthenticated = (state) => {
  const u = state.user?.currentUser;
  return !!(u?.accessToken && typeof u.accessToken === "string" && u.accessToken.trim() !== "");
};