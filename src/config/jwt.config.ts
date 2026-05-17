import { config } from "./index";

export const jwtConfig = {
  secret: config.jwt.secret,
  expiresIn: config.jwt.expiresIn,
  refreshSecret: config.jwt.refreshSecret,
  refreshExpiresIn: config.jwt.refreshExpiresIn,
};
