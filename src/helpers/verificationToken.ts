import jwt from "jsonwebtoken";

export const VERIFICATION_SECRET =
  process.env.EMAIL_VERIFICATION_SECRET || "default_verify_secret";

export const PASSWORD_RESET_SECRET =
  process.env.PASSWORD_RESET_SECRET || "default_password_reset_secret";


export function generateVerificationToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email, type: "email_verify" },
    VERIFICATION_SECRET,
    { expiresIn: "24h" },
  );
}

export function buildVerificationUrl(token: string): string {
  const base =
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL || "https://tuapp.com"
      : process.env.FRONTEND_URL || "http://localhost:3001";
  return `${base}/verify-email?token=${token}`;
}

export function verifyVerificationToken(
  token: string,
): { userId: number; email: string; type: string } {
  return jwt.verify(token, VERIFICATION_SECRET) as {
    userId: number;
    email: string;
    type: string;
  };
}

export function generatePasswordResetToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email, type: "password_reset" },
    PASSWORD_RESET_SECRET,
    { expiresIn: "1h" }, // El token expira en 1 hora por seguridad
  );
}

export function buildPasswordResetUrl(token: string): string {
  const base =
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL || "https://tuapp.com"
      : process.env.FRONTEND_URL || "http://localhost:3001";
  return `${base}/reset-password?token=${token}`;
}

export function verifyPasswordResetToken(
  token: string,
): { userId: number; email: string; type: string } {
  return jwt.verify(token, PASSWORD_RESET_SECRET) as {
    userId: number;
    email: string;
    type: string;
  };
}
