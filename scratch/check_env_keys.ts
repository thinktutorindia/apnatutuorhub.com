import * as fs from "fs";

console.log(".env exists:", fs.existsSync(".env"));
console.log(".env.local exists:", fs.existsSync(".env.local"));

const envContent = fs.existsSync(".env") ? fs.readFileSync(".env", "utf-8") : "";
const envLocalContent = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf-8") : "";

const getVarNames = (str: string) => {
  return str.split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map(line => line.split("=")[0].trim());
};

console.log("Keys in .env:", getVarNames(envContent));
console.log("Keys in .env.local:", getVarNames(envLocalContent));
