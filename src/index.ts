import * as dotenv from "dotenv";
dotenv.config();

function greet(name: string): string {
  const appName = process.env.APP_NAME || "TypeScript Docker Project";
  return `Hello, ${name}! Welcome to ${appName}!`;
}

// Example usage
console.log(greet("User"));
console.log(`Running in ${process.env.APP_ENV || "development"} mode`);
