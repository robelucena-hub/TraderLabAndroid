import "server-only";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

// Hash of a random string, compared against when the e-mail does not exist so
// that "unknown e-mail" and "wrong password" take the same time.
const DUMMY_HASH = "$2b$12$f7S4jXb6qSfj0wsHqP0/quBjYivW7T/3UUqYfPZKOfqsSt2wW.5u2";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return Boolean(hash) && matches;
}
