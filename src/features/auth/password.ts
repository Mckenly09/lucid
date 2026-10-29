/** Password rules from the design: 8+ characters, a letter and a number (Firebase's own minimum is 6). */
export const passwordChecks = (password: string) => ({
  length: password.length >= 8,
  letter: /\p{L}/u.test(password),
  number: /\d/.test(password),
});

export const passwordOk = (password: string) => Object.values(passwordChecks(password)).every(Boolean);
