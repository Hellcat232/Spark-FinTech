export const setupSessionCookies = (res, session) => {
  res.cookie('sessionId', session[0]._id, {
    httpOnly: true,
    expires: session[0].refreshTokenValidUntil,
  });

  res.cookie('refreshToken', session[0].refreshToken, {
    httpOnly: true,
    expires: session[0].refreshTokenValidUntil,
  });
};
